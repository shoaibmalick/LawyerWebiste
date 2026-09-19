import { createSlidingWindowStore } from "@/lib/sliding-window";

/**
 * Throttling for failed sign-in attempts.
 *
 * ## Why this is separate from `rateLimit`
 *
 * `rateLimit` counts *requests*; this counts *failures*. Someone who signs in
 * correctly ten times in a minute has done nothing wrong, and a receptionist
 * who mistypes twice must not be nudged closer to a block by their own
 * successful logins. So: only failures are recorded, and a success clears the
 * counter outright.
 *
 * ## Throttled, never locked
 *
 * There is deliberately **no per-account counter and no lockout**. If failures
 * were counted against the email address, anyone who knew the practice's admin
 * address could lock reception out of their own dashboard from anywhere in the
 * world, on demand, indefinitely — turning a brute-force defence into a
 * denial-of-service tool aimed at the people who need the system most.
 *
 * Counting against the *source* instead means an attacker slows down their own
 * connection and nobody else's. The block is always temporary and always
 * self-clearing; nothing here can put an account into a state that needs an
 * administrator to undo.
 *
 * ## Two tiers, which is where "progressive" comes in
 *
 * A single window is either too tight for a person who genuinely forgot their
 * password, or too loose to slow a script down. Two windows do both: a short
 * burst limit that a human brushes past and recovers from within a minute, and
 * a long sustained limit that a script hits and then sits behind for a quarter
 * of an hour.
 */
const TIERS = [
  /** Burst: a person fumbling their password. Recovers in a minute. */
  { windowMs: 60_000, max: 5 },
  /** Sustained: a script working through a list. Recovers in fifteen. */
  { windowMs: 15 * 60_000, max: 20 },
] as const;

/** The widest window any tier uses — what a key's history has to span. */
const HISTORY_MS = Math.max(...TIERS.map((tier) => tier.windowMs));

const store = createSlidingWindowStore();

export type LoginThrottleResult = {
  throttled: boolean;
  /** Seconds until the caller may try again. Zero when not throttled. */
  retryAfterSeconds: number;
};

const ALLOWED: LoginThrottleResult = { throttled: false, retryAfterSeconds: 0 };

/**
 * Whether this source has failed too often lately. Does not record anything —
 * checking must not itself count against the caller, or a throttled client
 * could never escape the window by waiting.
 */
export function checkLoginThrottle(source: string, now = Date.now()): LoginThrottleResult {
  const history = store.liveEvents(source, HISTORY_MS, now);
  if (history.length === 0) return ALLOWED;

  let retryAfterSeconds = 0;

  for (const tier of TIERS) {
    const withinTier = history.filter((timestamp) => now - timestamp < tier.windowMs);
    if (withinTier.length < tier.max) continue;

    // Wait until the oldest failure in this tier ages out of it.
    const oldest = withinTier[0] ?? now;
    const remainingMs = tier.windowMs - (now - oldest);
    retryAfterSeconds = Math.max(retryAfterSeconds, Math.ceil(remainingMs / 1000));
  }

  if (retryAfterSeconds <= 0) return ALLOWED;
  return { throttled: true, retryAfterSeconds };
}

/** Records one failed attempt from this source. */
export function recordLoginFailure(source: string, now = Date.now()): void {
  store.record(source, HISTORY_MS, now);
}

/**
 * Forgets this source's failures. Called on a successful sign-in, so the
 * receptionist who eventually remembers their password starts clean rather
 * than carrying a quarter of an hour of near-miss history.
 */
export function clearLoginFailures(source: string): void {
  store.clear(source);
}

/**
 * The retry hint, in words a receptionist can act on.
 *
 * "Try again in 847 seconds" is a number nobody converts. Rounding up to the
 * next minute is friendlier and slightly conservative, which is the right
 * direction for a hint.
 */
export function describeRetryWait(seconds: number): string {
  if (seconds <= 60) return "in a minute";
  return `in about ${Math.ceil(seconds / 60)} minutes`;
}

/** Drops all state. Exported for tests only. */
export function __resetLoginThrottle(): void {
  store.reset();
}
