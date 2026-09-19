import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSecret, sealSecret } from "./secret-box";

const SECRET = "re_live_not_a_real_key_0123456789";

let original: string | undefined;

beforeEach(() => {
  original = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-auth-secret-for-secret-box";
});

afterEach(() => {
  if (original === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = original;
});

describe("sealSecret / openSecret", () => {
  it("round-trips a secret", () => {
    expect(openSecret(sealSecret(SECRET))).toBe(SECRET);
  });

  it("round-trips non-ASCII and empty strings", () => {
    expect(openSecret(sealSecret("pässwörd — 密码"))).toBe("pässwörd — 密码");
    expect(openSecret(sealSecret(""))).toBe("");
  });

  it("does not store the plaintext", () => {
    const sealed = sealSecret(SECRET);
    expect(sealed).not.toContain(SECRET);
    expect(Buffer.from(sealed, "utf8").includes(SECRET)).toBe(false);
  });

  it("carries the version prefix", () => {
    expect(sealSecret(SECRET).startsWith("v1.")).toBe(true);
  });

  /**
   * The IV is random per call, so the column is not a lookup table. Without
   * this, anyone with read access could tell two rows hold the same API key
   * without decrypting either.
   */
  it("produces different ciphertext for the same plaintext", () => {
    expect(sealSecret(SECRET)).not.toBe(sealSecret(SECRET));
  });

  it("returns null for a tampered tag", () => {
    const parts = sealSecret(SECRET).split(".");
    const tag = Buffer.from(parts[3]!, "base64url");
    tag[0] = tag[0]! ^ 0xff;
    parts[3] = tag.toString("base64url");

    expect(openSecret(parts.join("."))).toBeNull();
  });

  it("returns null for tampered ciphertext", () => {
    const parts = sealSecret(SECRET).split(".");
    const ciphertext = Buffer.from(parts[2]!, "base64url");
    ciphertext[0] = ciphertext[0]! ^ 0xff;
    parts[2] = ciphertext.toString("base64url");

    expect(openSecret(parts.join("."))).toBeNull();
  });

  /**
   * The rotation case, and the one this whole design has to degrade gracefully
   * for: docs/PRIVACY_POSTURE.md lists rotating AUTH_SECRET as the session kill
   * switch, so it happens during an incident and must not throw.
   */
  it("returns null when AUTH_SECRET has changed", () => {
    const sealed = sealSecret(SECRET);
    process.env.AUTH_SECRET = "a-different-auth-secret";

    expect(openSecret(sealed)).toBeNull();
  });

  it("returns null for an unknown version", () => {
    const sealed = sealSecret(SECRET);
    expect(openSecret(`v2.${sealed.slice(3)}`)).toBeNull();
  });

  it.each([
    ["empty", ""],
    ["null", null],
    ["undefined", undefined],
    ["too few parts", "v1.aaa.bbb"],
    ["too many parts", "v1.aaa.bbb.ccc.ddd"],
    ["not base64url", "v1.!!!.???.***"],
    ["a bare secret someone pasted in by hand", SECRET],
  ])("returns null for %s", (_label, value) => {
    expect(openSecret(value)).toBeNull();
  });

  it("throws when AUTH_SECRET is missing", () => {
    delete process.env.AUTH_SECRET;
    expect(() => sealSecret(SECRET)).toThrow(/AUTH_SECRET/);
  });
});
