import { beforeAll, describe, expect, it } from "vitest";
import { __CAPTCHA_TTL_MS, __DIGIT_COUNT, createCaptcha, verifyCaptcha } from "./captcha";

beforeAll(() => {
  process.env.AUTH_SECRET ??= "test-secret-for-captcha-tests-only";
});

/**
 * Recovers the expected answer the way only the server can — by asking for a
 * challenge and reading it back through a successful verification.
 *
 * There is deliberately no way to read the answer out of the token or the SVG,
 * which is the whole point, so the tests below brute-force the 10,000-value
 * space once rather than reaching inside the module.
 */
function solve(token: string): string {
  for (let i = 0; i < 10 ** __DIGIT_COUNT; i += 1) {
    const guess = String(i).padStart(__DIGIT_COUNT, "0");
    if (verifyCaptcha(token, guess, { consume: false }) === "ok") return guess;
  }
  throw new Error("no answer verified — the token does not match any digit string");
}

describe("createCaptcha", () => {
  /**
   * The bug this pins. The first version put the answer into the token in
   * plaintext and merely signed it — but the token travels to the browser in a
   * hidden form field, so a bot could read `4821` straight out of the HTML and
   * never look at the picture. Signing proves the server issued it; it hides
   * nothing. The token has to be *encrypted*.
   */
  it("does not leak the answer in the token", () => {
    const { token } = createCaptcha();
    const answer = solve(token);

    expect(token).not.toContain(answer);
    // Nor in any obvious encoding of it.
    expect(Buffer.from(token).toString("utf8")).not.toContain(answer);
    expect(token.replace(/[^0-9]/g, "")).not.toContain(answer);
  });

  /**
   * The other half of the same property. If the digits were SVG `<text>` the
   * answer would be sitting in the markup; they are drawn as line segments so
   * that reading the DOM tells a script nothing.
   */
  it("does not leak the answer in the rendered image", () => {
    const { token, svg } = createCaptcha();
    const answer = solve(token);

    expect(svg).not.toContain(answer);
    expect(svg).not.toContain("<text");
    // Only path geometry and the accessible label, which is generic.
    expect(svg).toContain("<path");
  });

  it("issues a different challenge every time", () => {
    const first = createCaptcha();
    const second = createCaptcha();

    expect(first.token).not.toBe(second.token);
    expect(first.svg).not.toBe(second.svg);
  });
});

describe("verifyCaptcha", () => {
  it("accepts the right answer", () => {
    const { token } = createCaptcha();
    expect(verifyCaptcha(token, solve(token))).toBe("ok");
  });

  it("tolerates surrounding whitespace", () => {
    const { token } = createCaptcha();
    expect(verifyCaptcha(token, `  ${solve(token)} `)).toBe("ok");
  });

  it("rejects a wrong answer", () => {
    const { token } = createCaptcha();
    const wrong = solve(token) === "0000" ? "1111" : "0000";

    expect(verifyCaptcha(token, wrong)).toBe("wrong");
  });

  it("rejects a missing token or answer", () => {
    const { token } = createCaptcha();

    expect(verifyCaptcha(undefined, "1234")).toBe("invalid");
    expect(verifyCaptcha(token, undefined)).toBe("invalid");
    expect(verifyCaptcha(token, "")).toBe("invalid");
  });

  it("rejects a token that was not issued by this server", () => {
    expect(verifyCaptcha("not-a-token", "1234")).toBe("invalid");
    expect(verifyCaptcha("aaa.bbb.ccc", "1234")).toBe("invalid");
  });

  it("rejects a tampered token", () => {
    const { token } = createCaptcha();
    const answer = solve(token);

    // Flip a character in the ciphertext. GCM's auth tag must catch it.
    const [iv, ciphertext, tag] = token.split(".");
    const flipped = ciphertext!.startsWith("A")
      ? `B${ciphertext!.slice(1)}`
      : `A${ciphertext!.slice(1)}`;

    expect(verifyCaptcha(`${iv}.${flipped}.${tag}`, answer)).toBe("invalid");
  });

  it("rejects an expired challenge", () => {
    const issued = Date.now();
    const { token } = createCaptcha(issued);
    const answer = solve(token);

    expect(verifyCaptcha(token, answer, { now: issued + __CAPTCHA_TTL_MS + 1 })).toBe("expired");
  });

  /**
   * The property that makes this worth having at all. Without a burned nonce a
   * bot solves one challenge and replays that token forever — unlimited wrong
   * password attempts, which is exactly what this was added to stop.
   */
  it("lets one solved challenge buy exactly one attempt", () => {
    const { token } = createCaptcha();
    const answer = solve(token);

    expect(verifyCaptcha(token, answer)).toBe("ok");
    expect(verifyCaptcha(token, answer)).toBe("replayed");
    expect(verifyCaptcha(token, answer)).toBe("replayed");
  });

  /**
   * Two callers check the same answer — the server action so it can say "that
   * didn't match", and authorize() because that is the choke point a bot
   * posting straight to /api/auth/callback/admin also passes. If both burned
   * the nonce, every real sign-in would fail on the second check.
   */
  it("does not spend the challenge when only peeking", () => {
    const { token } = createCaptcha();
    const answer = solve(token);

    expect(verifyCaptcha(token, answer, { consume: false })).toBe("ok");
    expect(verifyCaptcha(token, answer, { consume: false })).toBe("ok");
    // Still usable for the one real attempt.
    expect(verifyCaptcha(token, answer)).toBe("ok");
  });

  it("reports a replay even when only peeking", () => {
    const { token } = createCaptcha();
    const answer = solve(token);

    expect(verifyCaptcha(token, answer)).toBe("ok");
    // The action must not cheerfully accept what authorize() will reject.
    expect(verifyCaptcha(token, answer, { consume: false })).toBe("replayed");
  });

  it("does not spend the challenge on a wrong answer", () => {
    // A typo must not force the user to fetch a whole new challenge.
    const { token } = createCaptcha();
    const answer = solve(token);
    const wrong = answer === "0000" ? "1111" : "0000";

    expect(verifyCaptcha(token, wrong)).toBe("wrong");
    expect(verifyCaptcha(token, answer)).toBe("ok");
  });
});

/* -------------------------------------------------------------------------- */
/* G5.5 / G5.6 / G5.7 — key derivation, IV, and comparison                    */
/* -------------------------------------------------------------------------- */

import { createDecipheriv, createHash, hkdfSync } from "node:crypto";

/**
 * G5.5 — the AES key must be derived through HKDF, not by hashing the secret.
 *
 * AUTH_SECRET is not captcha key material; it is Auth.js's JWT signing secret,
 * which this module borrows. Feeding it through a bare SHA-256 uses the same
 * secret for two unrelated cryptographic purposes with no separation between
 * them, so any weakness or disclosure in one context transfers directly to the
 * other. HKDF with a distinct `info` string makes the two keys independent.
 */
describe("G5.5 key derivation", () => {
  it("does not use a bare SHA-256 of AUTH_SECRET as the AES key", () => {
    const { token } = createCaptcha();
    const [iv, ciphertext, tag] = token.split(".").map((p) => Buffer.from(p, "base64url"));

    // The old derivation, reproduced exactly. If this still opens the token,
    // the key is a bare hash of the secret.
    const legacyKey = createHash("sha256").update(process.env.AUTH_SECRET!).digest();

    expect(() => {
      const d = createDecipheriv("aes-256-gcm", legacyKey, iv!);
      d.setAuthTag(tag!);
      Buffer.concat([d.update(ciphertext!), d.final()]);
    }).toThrow();
  });

  it("derives a key that differs per domain, so two uses never share one", () => {
    const secret = Buffer.from(process.env.AUTH_SECRET!, "utf8");
    const salt = Buffer.from("smile-studio-dental/captcha/v1", "utf8");

    const a = Buffer.from(hkdfSync("sha256", secret, salt, "captcha-token-encryption", 32));
    const b = Buffer.from(hkdfSync("sha256", secret, salt, "some-other-purpose", 32));

    expect(a.equals(b)).toBe(false);
  });
});

/** G5.6 — verified, not changed: the IV is fresh per token and 96 bits. */
describe("G5.6 IV and authenticated expiry", () => {
  it("uses a fresh 96-bit IV for every token", () => {
    const ivs = new Set<string>();
    for (let i = 0; i < 25; i += 1) {
      const [iv] = createCaptcha().token.split(".");
      expect(Buffer.from(iv!, "base64url")).toHaveLength(12);
      ivs.add(iv!);
    }
    expect(ivs.size).toBe(25);
  });

  it("keeps the expiry inside the authenticated payload, not beside it", () => {
    const issued = Date.now();
    const { token } = createCaptcha(issued);

    // Tampering with any byte must break the GCM tag rather than move the
    // expiry — an expiry outside the AEAD could be edited to extend a token.
    const [iv, ciphertext, tag] = token.split(".");
    const bytes = Buffer.from(ciphertext!, "base64url");
    bytes[bytes.length - 1] ^= 0xff;
    const tampered = [iv, bytes.toString("base64url"), tag].join(".");

    expect(verifyCaptcha(tampered, "0000", { now: issued })).toBe("invalid");
    // And the token carries no readable timestamp for an attacker to edit.
    expect(token).not.toContain(String(issued));
  });
});

/**
 * G5.7 — the answer comparison is constant-time.
 *
 * Low practical exploitability: the answer is four digits and the attacker
 * already holds the token they are guessing against. The reason to fix it is
 * that "compare secrets with ===" is the habit, not this instance.
 */
describe("G5.7 comparison", () => {
  it("still accepts the right answer and rejects the wrong one", () => {
    const { token } = createCaptcha();
    const answer = solve(token);
    expect(verifyCaptcha(token, answer, { consume: false })).toBe("ok");
    expect(verifyCaptcha(token, answer === "0000" ? "1111" : "0000")).toBe("wrong");
  });

  it("handles a wrong answer of a different length without throwing", () => {
    // timingSafeEqual throws on a length mismatch, so a naive swap breaks here.
    const { token } = createCaptcha();
    for (const bad of ["", "1", "12345678", "x".repeat(500)]) {
      expect(() => verifyCaptcha(token, bad)).not.toThrow();
    }
    expect(verifyCaptcha(token, "1")).toBe("wrong");
  });
});
