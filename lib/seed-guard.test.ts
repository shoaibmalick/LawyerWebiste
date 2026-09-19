import { describe, expect, it } from "vitest";
import { assessSeed, databaseHost, expectedConfirmation, isNonProductionHost } from "./seed-guard";

const LOCAL = "postgresql://postgres:postgres@localhost:5432/smile_studio_dental?schema=public";
const SUPABASE = "postgresql://postgres:hunter2@db.abcdefgh.supabase.co:5432/postgres";

const ctx = (over: Partial<Parameters<typeof assessSeed>[0]> = {}) => ({
  nodeEnv: undefined,
  databaseUrl: LOCAL,
  allowDestructive: undefined,
  isTty: false,
  ...over,
});

describe("isNonProductionHost", () => {
  it("recognises the local hosts a developer actually uses", () => {
    for (const host of ["localhost", "127.0.0.1", "0.0.0.0", "host.docker.internal"]) {
      expect(isNonProductionHost(`postgresql://u:p@${host}:5432/db`), host).toBe(true);
    }
  });

  /**
   * The important direction. An unfamiliar or unparseable connection string is
   * production until proven otherwise — the safe answer when we do not know.
   */
  it("treats anything it cannot positively identify as production", () => {
    for (const url of [SUPABASE, "postgresql://u:p@10.0.0.5:5432/db", "not-a-url", "", undefined]) {
      expect(isNonProductionHost(url), String(url)).toBe(false);
    }
  });
});

describe("assessSeed", () => {
  it("allows the ordinary local case without ceremony", () => {
    const decision = assessSeed(ctx());

    expect(decision.verdict).toBe("allow");
    expect(decision.message).toContain("localhost");
  });

  /**
   * The gap this closes. NODE_ENV is routinely unset when someone runs a
   * one-off script against a production connection string, so the previous
   * guard — which keyed only on NODE_ENV — would have let this through.
   */
  it("refuses a remote database even when NODE_ENV is unset", () => {
    const decision = assessSeed(ctx({ databaseUrl: SUPABASE }));

    expect(decision.verdict).toBe("refuse");
    expect(decision.message).toContain("not a recognised local host");
  });

  it("still refuses on NODE_ENV=production even against a local database", () => {
    expect(assessSeed(ctx({ nodeEnv: "production" })).verdict).toBe("refuse");
  });

  it("refuses an unparseable connection string rather than guessing", () => {
    expect(assessSeed(ctx({ databaseUrl: "postgres@@@broken" })).verdict).toBe("refuse");
    expect(assessSeed(ctx({ databaseUrl: undefined })).verdict).toBe("refuse");
  });

  /**
   * ALLOW_DESTRUCTIVE_SEED=1 is exactly the kind of variable someone exports in
   * a shell and forgets. With a person at the keyboard it is no longer enough
   * on its own — they have to type the host name.
   */
  it("demands a typed confirmation when overridden at a terminal", () => {
    const decision = assessSeed(ctx({ databaseUrl: SUPABASE, allowDestructive: "1", isTty: true }));

    expect(decision.verdict).toBe("confirm");
    expect(decision.message).toContain("DESTROY ALL BOOKINGS");
    expect(decision.message).toContain("db.abcdefgh.supabase.co");
  });

  it("proceeds without a prompt when overridden with no terminal, and says so loudly", () => {
    const decision = assessSeed(
      ctx({ databaseUrl: SUPABASE, allowDestructive: "1", isTty: false }),
    );

    expect(decision.verdict).toBe("allow");
    expect(decision.message).toContain("DESTRUCTIVE SEED");
    expect(decision.message).toContain("no terminal");
  });

  it('does not accept any override value other than exactly "1"', () => {
    for (const value of ["true", "yes", "0", "", "TRUE"]) {
      expect(
        assessSeed(ctx({ databaseUrl: SUPABASE, allowDestructive: value })).verdict,
        value,
      ).toBe("refuse");
    }
  });

  it("names a database in every message, so the log says which one", () => {
    for (const decision of [
      assessSeed(ctx()),
      assessSeed(ctx({ databaseUrl: SUPABASE })),
      assessSeed(ctx({ databaseUrl: SUPABASE, allowDestructive: "1", isTty: true })),
      assessSeed(ctx({ databaseUrl: SUPABASE, allowDestructive: "1" })),
    ]) {
      expect(decision.message).toMatch(/localhost|supabase\.co/);
    }
  });

  /** The connection string carries a password. It must never be echoed. */
  it("never leaks the password from the connection string", () => {
    const decision = assessSeed(ctx({ databaseUrl: SUPABASE, allowDestructive: "1", isTty: true }));

    expect(decision.message).not.toContain("hunter2");
  });
});

describe("expectedConfirmation", () => {
  it("is the host name, which the prompt has just shown the operator", () => {
    expect(expectedConfirmation(SUPABASE)).toBe("db.abcdefgh.supabase.co");
    expect(databaseHost(LOCAL)).toBe("localhost");
  });
});
