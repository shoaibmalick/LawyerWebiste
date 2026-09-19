/**
 * Work out which client a request came from, for rate-limiting purposes only.
 *
 * ## The bug this exists to fix
 *
 * Every rate-limited route used to key on the raw header:
 *
 *     const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
 *
 * `x-forwarded-for` is set by the client. Sending a different value on each
 * request gave an attacker a fresh bucket every time — unlimited quota on
 * booking, leads, reviews, chatbot and signup — and inserted an unbounded
 * number of distinct keys into the limiter's map along the way.
 *
 * ## The trust assumption, stated plainly
 *
 * There is no way to identify a caller from inside the application without
 * trusting *something* the network layer told us. What we can do is prefer the
 * headers a client cannot forge over the one it can:
 *
 * 1. `x-vercel-forwarded-for` — set by Vercel's edge on the way in, replacing
 *    anything the client sent. This is the trustworthy one in production.
 * 2. `x-real-ip` — also platform-set on Vercel, and the convention most
 *    reverse proxies follow.
 * 3. `x-forwarded-for`, leftmost entry — the fallback. Correct behind a proxy
 *    that *overwrites* the header (Vercel does). Behind a proxy that *appends*
 *    to a client-supplied value, the leftmost entry is the client's own text
 *    and this degrades to the old behaviour.
 *
 * So: on Vercel this is sound because (1) is present. Behind any other proxy,
 * **re-check which header that proxy sets and whether it overwrites** before
 * relying on this. That is a deployment-time assumption, not something the
 * code can verify, which is exactly why it is written down here.
 *
 * Never use this for anything but rate limiting. It is not an identity.
 */

/** Longest string we will use as part of a limiter key. */
const MAX_IP_LENGTH = 45; // an IPv6 address with an IPv4 suffix is 45 characters

/**
 * Only characters that can appear in an IPv4 or IPv6 address. Anything else
 * means the header is not an address, and letting arbitrary client text become
 * a map key is how the limiter's map grew unbounded.
 *
 * Deliberately does not accept a zone id (`fe80::1%eth0`). Zone ids identify a
 * local interface for link-local addresses, which are not routable — nothing
 * carrying one ever reached a public server, so accepting them would only
 * widen the space of usable keys for no gain.
 */
const IP_SHAPED = /^[0-9a-fA-F:.]+$/;

function firstValidAddress(value: string | null): string | null {
  if (!value) return null;

  for (const part of value.split(",")) {
    const candidate = part.trim();
    if (candidate.length > 0 && candidate.length <= MAX_IP_LENGTH && IP_SHAPED.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Returns an address, or `"unknown"`.
 *
 * `"unknown"` puts every unidentifiable caller in one shared bucket, which
 * means they throttle each other. That is deliberate: the alternative — a
 * unique key per unidentifiable caller — is no limit at all. Failing closed is
 * the right direction for an abuse control. In practice this only happens in
 * local development, where a single shared bucket is harmless.
 */
export function clientIp(requestHeaders: Headers): string {
  return (
    firstValidAddress(requestHeaders.get("x-vercel-forwarded-for")) ??
    firstValidAddress(requestHeaders.get("x-real-ip")) ??
    firstValidAddress(requestHeaders.get("x-forwarded-for")) ??
    "unknown"
  );
}
