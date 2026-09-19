import type { NextConfig } from "next";

/**
 * Content-Security-Policy, in report-only mode.
 *
 * **This blocks nothing.** It is a measurement step: the browser evaluates the
 * policy, reports what would have been refused, and loads the page regardless.
 * The security benefit arrives when it is switched to the enforcing
 * `Content-Security-Policy` header — until then, do not read this as "XSS is
 * handled".
 *
 * It ships report-only first because an enforcing policy written blind is the
 * fastest way to take a client's site down: Next injects inline bootstrap
 * scripts, Tailwind and `next/font` inject inline styles, and a practice may
 * later embed a map or a chat widget. Report-only tells us what a real policy
 * has to allow before we find out from a customer who cannot book.
 *
 * `'unsafe-inline'` on script-src is what makes this weak, and it is why
 * flipping to enforcing is a task rather than a keystroke — Next's inline
 * bootstrap needs either that or a per-request nonce, and a nonce means
 * rendering every page dynamically. That trade-off is a deliberate follow-up,
 * recorded in SECURITY_REVIEW.md.
 *
 * To flip it on later: collect violations from a few real sessions (homepage,
 * booking form, dashboard), widen the directives to cover the legitimate ones,
 * then rename this header to `Content-Security-Policy`.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' for Next's bootstrap; 'unsafe-eval' is NOT granted.
  "script-src 'self' 'unsafe-inline'",
  // Tailwind and next/font both emit inline styles.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Same-origin API routes only. Stripe redirects the browser rather than
  // being fetched from the page, so it does not belong here.
  "connect-src 'self'",
  // Stripe Checkout is a full-page redirect, and is allowed as a navigation.
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Response headers applied to every route.
 *
 * None were set, which meant the site could be framed by anyone — clickjacking
 * a "Book an appointment" button is the obvious abuse — browsers were free to
 * MIME-sniff responses, and full URLs leaked to third parties in the Referer
 * header.
 */
const securityHeaders = [
  // The site never needs framing, so deny outright rather than SAMEORIGIN.
  // frame-ancestors in the CSP above supersedes this in modern browsers; both
  // are here because this one still works where the CSP is only report-only.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Origin to other sites, full URL only to ourselves — so a customer's
  // booking URL is not handed to every third party they click through to.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here uses these; refuse them so an embedded script cannot ask.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  /**
   * Two years, subdomains included, and eligible for the preload list.
   *
   * Vercel sets HSTS on its own `*.vercel.app` domains, but nothing in this
   * repo guaranteed it on the custom domain a practice actually publishes —
   * and the custom domain is the one patients type. Without it, the first
   * request of a session can still go out over plaintext http, which is
   * exactly where a session cookie gets taken on café wifi.
   *
   * `preload` is a commitment: getting a domain onto the browser preload list
   * is easy and getting it off again takes months. Every subdomain must be
   * able to serve HTTPS before this ships. For a site that is only ever
   * `practice.com` and `www.practice.com` behind Vercel, that is already true.
   */
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  /**
   * Stop announcing the framework on every response.
   *
   * `X-Powered-By: Next.js` is free reconnaissance: it tells a scanner which
   * CVE list to work through before it has probed anything. Removing it is not
   * a defence on its own — version fingerprinting has other routes — but there
   * is no reason to volunteer it.
   */
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
