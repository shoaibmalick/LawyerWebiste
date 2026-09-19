import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Encryption for secrets the business owner types into the dashboard and we
 * have to store — today, the mail transport's API key and SMTP password.
 *
 * ## Why encrypted rather than hashed
 *
 * A password we only ever *check* gets hashed (see `lib/password.ts`). These we
 * have to hand back to a third party verbatim on every send, so they must be
 * recoverable. That makes the database the thing being defended: a dump, a
 * backup on someone's laptop, or a read-only SQL injection yields ciphertext
 * rather than a live credential for the business's mailbox.
 *
 * ## Relationship to lib/captcha.ts
 *
 * Same primitive, same seal/open shape, deliberately *not* the same key. That
 * file's own header explains why: HKDF's `info` string binds a derived key to
 * one purpose, so a weakness or disclosure in one context does not transfer to
 * the other. Two differences from it, both intentional:
 *
 * 1. **A version prefix.** A captcha token lives ten minutes, so rotating its
 *    scheme costs nothing. These live as long as the deployment, so a future v2
 *    has to be able to tell what it is looking at rather than guess.
 * 2. **A client-neutral salt.** This string is part of the key. Putting a
 *    client's name in it would mean the template and each client repo derive
 *    different keys from the same secret, and a merge would quietly make every
 *    stored credential unreadable.
 *
 * ## Do not change KEY_SALT, KEY_INFO or VERSION after go-live
 *
 * Every one of them is key material or the label on it. Changing any of them
 * has exactly the effect of losing AUTH_SECRET: `openSecret` returns null for
 * everything already stored, and the owner has to re-enter their credentials.
 * A new scheme is a new VERSION handled alongside the old one, not an edit to
 * these lines.
 */

const KEY_SALT = Buffer.from("website-starter-kit/secret-box/v1", "utf8");
const KEY_INFO = "stored-secret-encryption";

/** Prefix on every sealed value, so a future scheme can be told apart from this one. */
const VERSION = "v1";

function key(): Buffer {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set — required to encrypt stored secrets.");
  // Extract-then-expand to exactly the 32 bytes AES-256 wants, whatever length
  // the secret happens to be. Not cached, for the same reason lib/captcha.ts
  // does not cache: a cache would hold a stale key across a secret rotation.
  return Buffer.from(hkdfSync("sha256", Buffer.from(value, "utf8"), KEY_SALT, KEY_INFO, 32));
}

/**
 * Encrypts a secret for storage. Returns `v1.<iv>.<ciphertext>.<tag>`.
 *
 * AES-256-GCM gives confidentiality *and* integrity in one pass, so there is no
 * separate signature to verify — a tampered value simply fails to open.
 *
 * The IV is random per call, so sealing the same key twice produces different
 * ciphertext. That matters more than it looks: without it the column becomes a
 * lookup table, and anyone with read access could tell that two clients share
 * an API key without decrypting either.
 */
export function sealSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, ...[iv, ciphertext, tag].map((part) => part.toString("base64url"))].join(".");
}

/**
 * Decrypts a stored secret, or returns `null`.
 *
 * Null rather than a throw, and one null for every cause — wrong key, tampered
 * ciphertext, unknown version, malformed base64. The caller cannot do anything
 * different about any of them, and the commonest cause by far is a rotated
 * AUTH_SECRET, which must degrade to "email is not configured" rather than
 * taking down the page that would let someone fix it.
 */
export function openSecret(value: string | null | undefined): string | null {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 4) return null;

  const [version, ...encoded] = parts;
  if (version !== VERSION) return null;

  try {
    const [iv, ciphertext, tag] = encoded.map((part) => Buffer.from(part, "base64url"));
    if (!iv || !ciphertext || !tag) return null;

    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
