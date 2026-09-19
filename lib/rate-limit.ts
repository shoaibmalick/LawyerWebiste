import { createSlidingWindowStore } from "@/lib/sliding-window";

type RateLimitResult = {
  success: boolean;
  remaining: number;
  /** How long until the caller's oldest recorded hit falls out of the window. */
  retryAfterSeconds: number;
};

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 5;

const store = createSlidingWindowStore();

export function rateLimit(
  key: string,
  opts: { windowMs?: number; max?: number } = {},
): RateLimitResult {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const max = opts.max ?? DEFAULT_MAX_REQUESTS;
  const now = Date.now();

  const existing = store.liveEvents(key, windowMs, now);

  if (existing.length >= max) {
    const oldest = existing[0] ?? now;
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  const timestamps = store.record(key, windowMs, now);
  return { success: true, remaining: max - timestamps.length, retryAfterSeconds: 0 };
}

/** Tracked key count. Exported for tests, not part of the public API. */
export function __trackedKeyCount(): number {
  return store.size();
}

/** Clears all state. Exported for tests only. */
export function __resetRateLimit(): void {
  store.reset();
}
