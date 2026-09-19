import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

/**
 * A self-contained CAPTCHA for the sign-in form.
 *
 * ## What it is for
 *
 * `lib/login-throttle.ts` bounds how many attempts one *source* can make. It
 * cannot tell a person from a script, and it hands every new IP a fresh
 * budget — so a bot spread across many addresses still gets a large number of
 * free guesses. This asks the caller to prove they are looking at a picture.
 *
 * ## Why no third-party service
 *
 * Turnstile or hCaptcha would be stronger, and this is deliberately built so
 * either could replace it later. They need an account, a pair of keys, and a
 * CSP that permits a third-party script and frame. This needs none of those,
 * so it protects a client the moment it is deployed rather than whenever
 * somebody gets round to provisioning.
 *
 * ## Be honest about the strength
 *
 * This stops commodity form-spam bots, which do not do OCR. A determined
 * attacker who writes a solver *for this specific site* will get past it —
 * seven-segment digits are not hard to recognise. It is one layer on top of
 * the throttle and bcrypt's cost, not a replacement for either, and
 * SECURITY_REVIEW.md says so rather than implying the login is now bot-proof.
 *
 * ## The two properties that actually matter
 *
 * 1. **The answer is never in the page.** The digits are drawn as line
 *    segments in an inline SVG, and the expected value only ever exists inside
 *    an *encrypted* token — signing would not be enough, since a signed token
 *    is still readable and this one sits in a hidden field. Reading the markup
 *    tells you nothing.
 * 2. **A solved challenge cannot be replayed.** Each token carries a nonce
 *    that is burned on first use, so capturing one good answer does not buy
 *    unlimited attempts — which is the whole thing being defended against.
 */

/** How long a challenge stays valid. Long enough to type, short enough to matter. */
const TTL_MS = 10 * 60 * 1000;

/** Digits in a challenge. Four is enough to make guessing pointless (1 in 10,000). */
const DIGIT_COUNT = 4;

/**
 * The token is **encrypted**, not merely signed.
 *
 * This is the difference between a captcha and a decoration. A signed token
 * proves the server issued it, but anyone can still read what is inside — and
 * the token travels to the browser in a hidden form field. Put the answer in a
 * signed-but-readable token and a bot skips the picture entirely: it reads
 * `4821` straight out of the HTML and posts it back.
 *
 * AES-256-GCM gives confidentiality *and* integrity in one pass, so there is no
 * separate signature to check and no way to tamper with the ciphertext without
 * the tag failing.
 *
 * The key is derived from AUTH_SECRET, which every deployment already has —
 * nothing new to provision, and it rotates with the sessions it sits beside.
 */
/**
 * HKDF parameters. Both are constants, and both matter.
 *
 * `AUTH_SECRET` is not captcha key material — it is Auth.js's JWT signing
 * secret, which this module borrows because every deployment already has one.
 * Hashing it into an AES key, as this used to, means the same secret does two
 * unrelated cryptographic jobs with nothing separating them: a weakness or a
 * disclosure in either context transfers straight to the other.
 *
 * HKDF exists for exactly this. The `info` string binds the output to one
 * purpose, so the captcha key and any future key derived from the same secret
 * are independent of each other. Changing either constant invalidates every
 * outstanding token, which is harmless — they last ten minutes.
 */
const KEY_SALT = Buffer.from("smile-studio-dental/captcha/v1", "utf8");
const KEY_INFO = "captcha-token-encryption";

function key(): Buffer {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set — required to encrypt captcha challenges.");
  // Extract-then-expand to exactly the 32 bytes AES-256 wants, whatever length
  // the secret happens to be. Not cached: hkdfSync on 32 bytes costs
  // microseconds, and a cache would hold a stale key across a secret rotation.
  return Buffer.from(hkdfSync("sha256", Buffer.from(value, "utf8"), KEY_SALT, KEY_INFO, 32));
}

/**
 * Compare two secrets without leaking where they first differ.
 *
 * The length check in front is not a weakness here: `timingSafeEqual` throws
 * outright on a length mismatch, and the answer's length is fixed and public
 * (four digits) rather than secret.
 *
 * Honest about the value: with a four-digit answer and an attacker who already
 * holds the token they are guessing against, the practical leak is negligible.
 * It is fixed because comparing secrets with `===` is the habit worth removing,
 * not because this instance is dangerous.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function seal(payload: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, ciphertext, tag].map((part) => part.toString("base64url")).join(".");
}

function open(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const [iv, ciphertext, tag] = parts.map((part) => Buffer.from(part, "base64url"));
    if (!iv || !ciphertext || !tag) return null;

    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key, tampered ciphertext, or malformed base64 — all the same
    // answer to the caller: this is not a token we issued.
    return null;
  }
}

/**
 * Nonces already spent.
 *
 * In memory, so it resets on deploy and is per-instance — the same limitation
 * the rate limiter has. The consequence here is narrow: at worst a captured
 * token could be replayed on a different instance, and it still expires within
 * TTL_MS. Recorded rather than hidden.
 */
const spentNonces = new Map<string, number>();

function burnNonce(nonce: string, now: number): boolean {
  // Opportunistic cleanup, so this cannot grow without bound.
  if (spentNonces.size > 5000) {
    for (const [spent, expiry] of spentNonces) {
      if (expiry <= now) spentNonces.delete(spent);
    }
  }

  const existing = spentNonces.get(nonce);
  if (existing !== undefined && existing > now) return false;

  spentNonces.set(nonce, now + TTL_MS);
  return true;
}

export type Captcha = {
  /** Encrypted and opaque. Goes in a hidden field, comes back with the answer. */
  token: string;
  /** Inline SVG markup. Contains no text — only line segments. */
  svg: string;
};

/** Builds a fresh challenge. */
export function createCaptcha(now = Date.now()): Captcha {
  let answer = "";
  for (let i = 0; i < DIGIT_COUNT; i += 1) answer += String(randomInt(0, 10));

  const nonce = randomBytes(9).toString("base64url");
  const expiresAt = now + TTL_MS;

  return { token: seal(`${answer}|${nonce}|${expiresAt}`), svg: renderSvg(answer) };
}

export type CaptchaResult = "ok" | "wrong" | "expired" | "invalid" | "replayed";

/**
 * Checks a submitted answer against its token.
 *
 * Returns a reason rather than a boolean so the caller can distinguish "you
 * mistyped it" (show a fresh challenge, say so) from "this token is not one we
 * issued" (a script, or a very stale tab).
 *
 * ## Why `consume` exists
 *
 * Two places check the same answer, for different reasons: the server action
 * checks it so it can *say* "that code didn't match", and `authorize()` checks
 * it because that is the only choke point a bot posting straight to
 * `/api/auth/callback/admin` also passes through. If both burned the nonce,
 * the first would invalidate the challenge before the second ever saw it and
 * every sign-in would fail. So the action peeks (`consume: false`) and
 * `authorize()` is the one that spends it.
 */
export function verifyCaptcha(
  token: string | undefined | null,
  answer: string | undefined | null,
  { now = Date.now(), consume = true }: { now?: number; consume?: boolean } = {},
): CaptchaResult {
  if (!token || !answer) return "invalid";

  // GCM's auth tag makes this both the decryption and the integrity check —
  // a tampered token cannot be opened at all.
  const payload = open(token);
  if (payload === null) return "invalid";

  const [expected, nonce, expiresAtRaw] = payload.split("|");
  if (!expected || !nonce || !expiresAtRaw) return "invalid";

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return "expired";

  // Compare the answer before burning the nonce, so a typo does not consume
  // the challenge and force the user to start again.
  if (!constantTimeEquals(answer.trim(), expected)) return "wrong";

  // A peek must still report replay, or the action would cheerfully accept an
  // answer that authorize() is about to reject.
  if (!consume) {
    const spentUntil = spentNonces.get(nonce);
    return spentUntil !== undefined && spentUntil > now ? "replayed" : "ok";
  }

  // Burn before returning ok, so one correct answer buys exactly one attempt.
  // Without this a bot solves a single challenge and replays it forever, which
  // is the whole thing being defended against.
  if (!burnNonce(nonce, now)) return "replayed";

  return "ok";
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Seven-segment geometry, as coordinate pairs in a 0..1 box.
 *
 * Digits are drawn rather than written because SVG `<text>` would put the
 * answer straight into the markup, where a script would simply read it. Line
 * segments carry no such hint.
 */
const SEGMENTS = {
  top: [0, 0, 1, 0],
  topLeft: [0, 0, 0, 1],
  topRight: [1, 0, 1, 1],
  middle: [0, 1, 1, 1],
  bottomLeft: [0, 1, 0, 2],
  bottomRight: [1, 1, 1, 2],
  bottom: [0, 2, 1, 2],
} as const;

const DIGIT_SEGMENTS: Record<string, (keyof typeof SEGMENTS)[]> = {
  "0": ["top", "topLeft", "topRight", "bottomLeft", "bottomRight", "bottom"],
  "1": ["topRight", "bottomRight"],
  "2": ["top", "topRight", "middle", "bottomLeft", "bottom"],
  "3": ["top", "topRight", "middle", "bottomRight", "bottom"],
  "4": ["topLeft", "topRight", "middle", "bottomRight"],
  "5": ["top", "topLeft", "middle", "bottomRight", "bottom"],
  "6": ["top", "topLeft", "middle", "bottomLeft", "bottomRight", "bottom"],
  "7": ["top", "topRight", "bottomRight"],
  "8": ["top", "topLeft", "topRight", "middle", "bottomLeft", "bottomRight", "bottom"],
  "9": ["top", "topLeft", "topRight", "middle", "bottomRight", "bottom"],
};

const WIDTH = 180;
const HEIGHT = 60;

function jitter(range: number): number {
  return (randomInt(0, 2000) / 1000 - 1) * range;
}

/**
 * Draws the answer, with each glyph independently rotated and offset and a few
 * distractor strokes laid over the top.
 *
 * `currentColor` throughout, so the challenge inherits the theme's ink and
 * stays legible in whatever palette a client has chosen — a captcha nobody can
 * read is an outage, not a security control.
 */
function renderSvg(answer: string): string {
  const cellWidth = 30;
  const glyphWidth = 16;
  const glyphHeight = 34;
  const startX = (WIDTH - answer.length * cellWidth) / 2;

  const glyphs = [...answer]
    .map((digit, index) => {
      const segments = DIGIT_SEGMENTS[digit] ?? [];
      const path = segments
        .map((name) => {
          const [x1, y1, x2, y2] = SEGMENTS[name];
          const sx = (x1 * glyphWidth + jitter(1.4)).toFixed(1);
          const sy = (y1 * (glyphHeight / 2) + jitter(1.4)).toFixed(1);
          const ex = (x2 * glyphWidth + jitter(1.4)).toFixed(1);
          const ey = (y2 * (glyphHeight / 2) + jitter(1.4)).toFixed(1);
          return `M${sx} ${sy}L${ex} ${ey}`;
        })
        .join("");

      const x = startX + index * cellWidth + jitter(2.5);
      const y = (HEIGHT - glyphHeight) / 2 + jitter(3);
      const rotation = jitter(14).toFixed(1);
      const pivotX = (glyphWidth / 2).toFixed(1);
      const pivotY = (glyphHeight / 2).toFixed(1);

      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation} ${pivotX} ${pivotY})"><path d="${path}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></g>`;
    })
    .join("");

  // Distractors: light enough not to obscure the digits for a person, present
  // enough to defeat naive pixel matching.
  const noise = Array.from({ length: 5 }, () => {
    const x1 = randomInt(0, WIDTH);
    const y1 = randomInt(0, HEIGHT);
    const x2 = randomInt(0, WIDTH);
    const y2 = randomInt(0, HEIGHT);
    return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="currentColor" stroke-width="1" opacity="0.28"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="Type the ${answer.length} digits shown">${noise}${glyphs}</svg>`;
}

/** Exported for tests only. */
export const __CAPTCHA_TTL_MS = TTL_MS;
export const __DIGIT_COUNT = DIGIT_COUNT;
