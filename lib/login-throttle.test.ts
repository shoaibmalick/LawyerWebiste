import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetLoginThrottle,
  checkLoginThrottle,
  clearLoginFailures,
  recordLoginFailure,
} from "./login-throttle";

const MINUTE = 60_000;

beforeEach(() => {
  __resetLoginThrottle();
});

describe("checkLoginThrottle", () => {
  it("lets a source through when it has no history", () => {
    expect(checkLoginThrottle("login:203.0.113.1").throttled).toBe(false);
  });

  it("lets a person fumble their password a few times", () => {
    const now = Date.now();
    for (let i = 0; i < 4; i++) recordLoginFailure("login:203.0.113.1", now);

    expect(checkLoginThrottle("login:203.0.113.1", now).throttled).toBe(false);
  });

  it("throttles the burst tier after five failures in a minute", () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) recordLoginFailure("login:203.0.113.1", now);

    const result = checkLoginThrottle("login:203.0.113.1", now);
    expect(result.throttled).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  /**
   * Throttled, never locked. A minute later the same person can try again —
   * nothing here puts an account into a state an administrator has to undo.
   */
  it("lets the same source back in once the burst window passes", () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) recordLoginFailure("login:203.0.113.1", now);

    expect(checkLoginThrottle("login:203.0.113.1", now + MINUTE + 1).throttled).toBe(false);
  });

  /**
   * The second tier is what makes this "progressive": a script that paces
   * itself just under the burst limit still runs into the sustained one, and
   * then waits a quarter of an hour rather than a minute.
   */
  it("catches a script pacing itself under the burst limit", () => {
    const start = Date.now();
    let now = start;

    // Four failures a minute for five minutes — never trips the burst tier.
    for (let minute = 0; minute < 5; minute++) {
      now = start + minute * MINUTE;
      for (let i = 0; i < 4; i++) recordLoginFailure("login:203.0.113.1", now);
      expect(checkLoginThrottle("login:203.0.113.1", now).throttled).toBe(minute >= 4);
    }

    const result = checkLoginThrottle("login:203.0.113.1", now);
    expect(result.throttled).toBe(true);
    // The sustained tier holds it for far longer than the burst tier would.
    expect(result.retryAfterSeconds).toBeGreaterThan(60);
  });

  /**
   * The whole reason failures are counted per source and never per account.
   * If they were counted per email, anyone who knew the practice's admin
   * address could lock reception out of their own dashboard, from anywhere,
   * on demand — turning a brute-force defence into a denial-of-service tool.
   */
  it("never lets one source affect another", () => {
    const now = Date.now();
    for (let i = 0; i < 20; i++) recordLoginFailure("login:198.51.100.7", now);

    expect(checkLoginThrottle("login:198.51.100.7", now).throttled).toBe(true);
    expect(checkLoginThrottle("login:203.0.113.1", now).throttled).toBe(false);
  });

  it("does not count the check itself as an attempt", () => {
    const now = Date.now();
    for (let i = 0; i < 4; i++) recordLoginFailure("login:203.0.113.1", now);

    // A throttled caller must be able to escape by waiting; if checking
    // counted, the window would keep resetting and the block never lift.
    for (let i = 0; i < 50; i++) checkLoginThrottle("login:203.0.113.1", now);

    expect(checkLoginThrottle("login:203.0.113.1", now).throttled).toBe(false);
  });
});

describe("clearLoginFailures", () => {
  it("wipes the history when someone finally signs in", () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) recordLoginFailure("login:203.0.113.1", now);
    expect(checkLoginThrottle("login:203.0.113.1", now).throttled).toBe(true);

    clearLoginFailures("login:203.0.113.1");

    expect(checkLoginThrottle("login:203.0.113.1", now).throttled).toBe(false);
  });
});
