/**
 * A bounded, self-pruning sliding-window event counter.
 *
 * Extracted so the request limiter (`lib/rate-limit.ts`) and the login throttle
 * (`lib/login-throttle.ts`) share one implementation of the fiddly parts —
 * pruning, eviction and the ordering that makes eviction least-recently-used —
 * rather than each growing its own unbounded `Map`.
 *
 * In-memory and per-process. State resets on redeploy and is not shared across
 * serverless instances, so the effective limit is `max × instances`. That is
 * acceptable for a single-instance deployment and is the documented limitation;
 * a distributed limiter (Upstash Redis, Vercel KV) is the fix if a client's
 * traffic ever needs one, and no caller would have to change.
 */

/**
 * Hard ceiling on tracked keys.
 *
 * The sweep below collects *expired* keys, which handles ordinary traffic. It
 * does not handle an attacker inventing a new key per request faster than
 * entries expire — without a ceiling that is an unbounded allocation driven by
 * a header the client controls. At roughly 100 bytes a key this caps the map
 * near a megabyte.
 */
const MAX_TRACKED_KEYS = 10_000;

/**
 * How often to sweep expired keys, and how many to examine per sweep.
 *
 * Amortised across calls rather than run on a timer, so it needs no lifecycle
 * management and cannot hold a serverless instance alive. The budget caps the
 * work any single request pays for.
 */
const SWEEP_EVERY_CALLS = 100;
const SWEEP_BUDGET = 500;

export type SlidingWindowStore = {
  /** Timestamps for `key` still inside `windowMs`, newest last. */
  liveEvents(key: string, windowMs: number, now: number): number[];
  /** Records an event at `now` and returns the resulting live timestamps. */
  record(key: string, windowMs: number, now: number): number[];
  /** Forgets `key` entirely — used when a login succeeds. */
  clear(key: string): void;
  /** Tracked key count. For tests. */
  size(): number;
  /** Drops all state. For tests. */
  reset(): void;
};

export function createSlidingWindowStore(): SlidingWindowStore {
  const events = new Map<string, number[]>();
  let callsSinceSweep = 0;

  function sweep(now: number, windowMs: number): void {
    let examined = 0;
    for (const [key, timestamps] of events) {
      if (examined >= SWEEP_BUDGET) break;
      examined += 1;

      const newest = timestamps[timestamps.length - 1];
      if (newest === undefined || now - newest >= windowMs) {
        events.delete(key);
      }
    }
  }

  /**
   * Evict from the front until we are under the ceiling.
   *
   * A `Map` iterates in insertion order, and `write` below deletes before
   * re-setting, so the front of the map is genuinely the least recently used
   * key rather than merely the first one ever seen. Without that delete, a
   * steadily-active caller would sit at the front and be the first evicted.
   */
  function evictOldest(): void {
    while (events.size > MAX_TRACKED_KEYS) {
      const oldest = events.keys().next();
      if (oldest.done) return;
      events.delete(oldest.value);
    }
  }

  function write(key: string, timestamps: number[]): void {
    events.delete(key);
    events.set(key, timestamps);
    evictOldest();
  }

  function prune(key: string, windowMs: number, now: number): number[] {
    return (events.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
  }

  function maybeSweep(now: number, windowMs: number): void {
    callsSinceSweep += 1;
    if (callsSinceSweep >= SWEEP_EVERY_CALLS) {
      callsSinceSweep = 0;
      sweep(now, windowMs);
    }
  }

  return {
    liveEvents(key, windowMs, now) {
      maybeSweep(now, windowMs);
      const timestamps = prune(key, windowMs, now);
      if (timestamps.length > 0) write(key, timestamps);
      return timestamps;
    },

    record(key, windowMs, now) {
      maybeSweep(now, windowMs);
      const timestamps = prune(key, windowMs, now);
      timestamps.push(now);
      write(key, timestamps);
      return timestamps;
    },

    clear(key) {
      events.delete(key);
    },

    size() {
      return events.size;
    },

    reset() {
      events.clear();
      callsSinceSweep = 0;
    },
  };
}

/** Exported for the store's own tests. */
export const __MAX_TRACKED_KEYS = MAX_TRACKED_KEYS;
