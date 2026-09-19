import { describe, expect, it } from "vitest";
import { resolveSeedAdmin } from "./seed-admin";

/**
 * Security finding H4 (SECURITY_REVIEW.md): `.env.example` once shipped a
 * working admin account — `admin@example.com` / `changeme123` — as the only
 * pre-filled values in the file. The fix was to blank both and have the seed
 * skip the admin user entirely when they are unset.
 *
 * Nothing pinned that. A fallback default reintroduced here — `?? "admin@…"`,
 * or loosening `&&` to `||` — restores a live admin account on a known
 * password in every client repo, silently. These are the tests that catch it.
 */
describe("resolveSeedAdmin", () => {
  it("skips the admin seed when neither variable is set", () => {
    expect(resolveSeedAdmin({})).toBeNull();
  });

  it("skips the admin seed when the variables are blank, as .env.example ships them", () => {
    // `.env.example` sets SEED_ADMIN_EMAIL="" / SEED_ADMIN_PASSWORD="", so the
    // copied-and-filled-in case arrives as empty strings, not undefined.
    expect(resolveSeedAdmin({ email: "", password: "" })).toBeNull();
  });

  it("skips the admin seed when the email is only whitespace", () => {
    expect(resolveSeedAdmin({ email: "   ", password: "a-real-password" })).toBeNull();
  });

  it("keeps a password's whitespace, which is legitimate, rather than trimming it", () => {
    expect(resolveSeedAdmin({ email: "reception@practice.test", password: "  spaced  " })).toEqual({
      email: "reception@practice.test",
      password: "  spaced  ",
    });
  });

  it("skips the admin seed when only the email is set", () => {
    expect(resolveSeedAdmin({ email: "reception@practice.test" })).toBeNull();
  });

  it("skips the admin seed when only the password is set", () => {
    expect(resolveSeedAdmin({ password: "a-real-password" })).toBeNull();
  });

  it("seeds the admin when both are set", () => {
    expect(
      resolveSeedAdmin({ email: "reception@practice.test", password: "a-real-password" }),
    ).toEqual({ email: "reception@practice.test", password: "a-real-password" });
  });

  it("never substitutes a default credential of its own", () => {
    // The specific pair H4 was about, asserted by value: no code path may
    // invent an account the deployer did not ask for.
    for (const env of [{}, { email: "" }, { password: "" }, { email: "", password: "" }]) {
      expect(resolveSeedAdmin(env)).toBeNull();
    }
  });
});
