import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetRateLimit, __trackedKeyCount, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to max requests for a key", () => {
    const key = "allows-up-to-max";
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, { max: 5 }).success).toBe(true);
    }
  });

  it("blocks the request after max is reached", () => {
    const key = "blocks-after-max";
    for (let i = 0; i < 5; i++) {
      rateLimit(key, { max: 5 });
    }
    const result = rateLimit(key, { max: 5 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    // Enough for a caller to set Retry-After rather than guess.
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks each key independently", () => {
    const keyA = "independent-a";
    const keyB = "independent-b";
    for (let i = 0; i < 5; i++) {
      rateLimit(keyA, { max: 5 });
    }
    expect(rateLimit(keyA, { max: 5 }).success).toBe(false);
    expect(rateLimit(keyB, { max: 5 }).success).toBe(true);
  });

  it("reports remaining requests correctly", () => {
    const key = "remaining-count";
    expect(rateLimit(key, { max: 3 }).remaining).toBe(2);
    expect(rateLimit(key, { max: 3 }).remaining).toBe(1);
    expect(rateLimit(key, { max: 3 }).remaining).toBe(0);
  });

  it("allows requests again once the window elapses", () => {
    vi.useFakeTimers();
    const key = "window-elapses";

    for (let i = 0; i < 5; i++) {
      rateLimit(key, { max: 5, windowMs: 60_000 });
    }
    expect(rateLimit(key, { max: 5, windowMs: 60_000 }).success).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(rateLimit(key, { max: 5, windowMs: 60_000 }).success).toBe(true);
  });
});

describe("memory growth", () => {
  beforeEach(() => {
    __resetRateLimit();
  });

  // The leak this sweep exists to stop: every one-time visitor used to keep a
  // map entry for the life of the process.
  it("does not retain keys for callers whose window has expired", () => {
    const windowMs = 50;

    // Enough distinct keys to trigger at least one sweep.
    for (let i = 0; i < 250; i++) {
      rateLimit(`visitor-${i}`, { windowMs, max: 5 });
    }
    const afterFirstWave = __trackedKeyCount();
    expect(afterFirstWave).toBeGreaterThan(0);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + windowMs * 10);
    // Another wave of traffic drives the sweep over the stale entries.
    for (let i = 0; i < 250; i++) {
      rateLimit(`later-visitor-${i}`, { windowMs, max: 5 });
    }
    vi.useRealTimers();

    // Stale keys are collected rather than accumulating with every wave.
    expect(__trackedKeyCount()).toBeLessThan(afterFirstWave + 250);
  });

  it("still limits correctly while sweeping", () => {
    for (let i = 0; i < 150; i++) {
      rateLimit(`noise-${i}`, { windowMs: 60_000, max: 5 });
    }

    const key = "steady-caller";
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, { windowMs: 60_000, max: 5 }).success).toBe(true);
    }
    expect(rateLimit(key, { windowMs: 60_000, max: 5 }).success).toBe(false);
  });
});
