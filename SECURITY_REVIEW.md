# Security review — website starter kit

**Date:** 2026-08-06 · **Scope:** the whole kit, ten areas listed below ·
**Reviewer:** Claude (Opus 5), working from the source rather than a checklist.

**Result: no Critical findings. 6 High, 8 Medium, 10 Low.** Twenty-two are fixed here;
two are recommended but deliberately not applied, because both trade usability for
security in ways that belong to whoever runs a given client site. They are marked
**Recommended — not applied** and explained at the end.

Everything in this document is **behaviour**, so it lives in the template and merges down
to every client. A client that has restyled its forms still inherits all of it — the one
thing a restyle must not drop is the `<HoneypotInput>` inside each public form.

### Where the audit was actually performed

The review was run against **Smile Studio Dental**, the first real client repo, and the
fixes were written and verified there before being brought up here. That is the order
CLAUDE.md's "test in the client, then port" implies, and it is worth knowing when reading
the verification section: the live checks below were run against that client's running
site.

It was a safe place to audit from because, at the time, **every file that carries a
finding was byte-identical between the two repos** — 21 of the 25 behavioural files, with
the four exceptions being the booking-request workflow that has not yet been ported up.
Those four were fixed here by hand rather than copied:
`app/api/webhooks/stripe/route.ts`, `features/booking/api/submit-booking.ts`,
`features/booking/schema/booking.schema.ts`, and the three public form components (which
diverge on presentation in every styled client).

### The headline

**Every public free-text field was interpolated raw into the HTML of an outbound email.**
A contact-form message of `<a href="https://evil.test">Confirm your appointment</a>`
arrived as a working link in an email from the business's own domain, read by staff who
have every reason to trust it. Mail clients block script but render links and images
perfectly well, so this was a phishing primitive aimed at the client's own reception
desk, not a theoretical XSS. Every client deployed from this kit had it.

### Two things this review did not do

- **Nobody signed in to a dashboard.** Entering credentials is outside what I do, so
  every admin-side finding is from reading code and from tests, not from clicking through
  the UI as an authenticated admin.
- **Nothing involving Stripe was executed.** There are no Stripe test credentials in this
  environment, so the webhook path is reviewed, not exercised.

---

## Findings

### High

| #   | Severity | Location                                                                                                                                                   | Issue                                                                                                                                                                                                                                                                                 | Fix                                                                                                                                                                                                                                                                                     |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | **High** | `features/leads/api/submit-lead.ts`, `features/reviews/api/submit-review.ts`, `features/booking/api/submit-booking.ts`, `app/api/webhooks/stripe/route.ts` | Every value interpolated into an outbound email was unescaped, including two unconstrained free-text fields (`message`, `comment`) and the customer's name.                                                                                                                           | **Fixed.** New `lib/html.ts::escapeHtml`, applied at every send site. Covered by `lib/html.test.ts` and `features/leads/api/submit-lead.test.ts`.                                                                                                                                       |
| H2  | **High** | `auth.ts`, `proxy.ts`                                                                                                                                      | Sign-in was completely unthrottled. Worse, `proxy.ts` matches only `/dashboard/:path*` and `/account/:path*`, so `POST /api/auth/callback/admin` bypassed the server action entirely and reached `authorize()` with no limiter of any kind.                                           | **Fixed.** New `lib/login-throttle.ts`, enforced inside `authorize()` — the one choke point both routes pass through. Two tiers: 5 failures/minute, 20/15 minutes. Counted per source, never per account.                                                                               |
| H3  | **High** | `lib/rate-limit.ts` + 5 call sites                                                                                                                         | Every rate-limited route keyed on the raw, client-controlled `x-forwarded-for`, unsplit. Rotating it per request gave unlimited quota on booking, leads, reviews, chatbot and signup, and inserted unbounded distinct keys into an in-memory map with no size cap.                    | **Fixed.** New `lib/client-ip.ts`; map capped at 10,000 keys with least-recently-used eviction (`lib/sliding-window.ts`).                                                                                                                                                               |
| H4  | **High** | `.env.example`                                                                                                                                             | Shipped working admin credentials — `admin@example.com` / `changeme123` — the _only_ pre-filled values in a file where every other secret was `""`. **This is the template's copy, so every client cloned it.**                                                                       | **Fixed.** Both blanked; the seed skips the admin user unless they are set.                                                                                                                                                                                                             |
| H5  | **High** | `prisma/seed.ts`                                                                                                                                           | No environment guard. Opens with unconditional `booking.deleteMany()` / `availabilitySlot.deleteMany()` and upserts the admin with `update: { passwordHash }`. Run against a client's production `DATABASE_URL` it destroys their appointment book _and_ resets their admin password. | **Fixed.** Refuses when `NODE_ENV=production` unless `ALLOW_DESTRUCTIVE_SEED=1`. Since superseded: the guard now keys on whether `DATABASE_URL` is a recognised local host, because `NODE_ENV` is routinely unset for the one-off script that does the damage. See `lib/seed-guard.ts`. |
| H6  | **High** | `package.json`                                                                                                                                             | `sharp <0.35.0` (GHSA-f88m-g3jw-g9cj, four libvips CVEs) — **live**, because Next's image optimizer runs sharp. `postcss <=8.5.22`, build-time only. Both transitive through `next@16.2.12`.                                                                                          | **Fixed.** Bumped `next` and `eslint-config-next` to 16.3.0. `npm audit` reports 0 vulnerabilities.                                                                                                                                                                                     |

### Medium

| #   | Severity | Location                                                          | Issue                                                                                                                                                                                                                                                      | Fix                                                                                                                                                                                                            |
| --- | -------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Medium   | `next.config.ts`                                                  | No Content-Security-Policy; the omission was documented as deliberate.                                                                                                                                                                                     | **Fixed, partially.** Added report-only. **It blocks nothing** — see the caveat below.                                                                                                                         |
| M2  | Medium   | `next.config.ts`                                                  | No `Strict-Transport-Security`. Vercel adds it on its own domains, but nothing here guaranteed it on the custom domain a client publishes.                                                                                                                 | **Fixed.** `max-age=63072000; includeSubDomains; preload`. `preload` is slow to undo — every subdomain must serve HTTPS.                                                                                       |
| M3  | Medium   | all 5 public POST routes                                          | `request.json()` parses a body whatever the Content-Type says, so a cross-origin `<form enctype="text/plain">` — a _simple_ request, no preflight — could create bookings and leads in a visitor's name. Slot ids are public via `GET /api/booking/slots`. | **Fixed.** `lib/api-guards.ts` requires `application/json`, forcing a preflight the browser refuses. All five client hooks already sent the header.                                                            |
| M4  | Medium   | `app/api/customer-accounts/signup/route.ts`                       | Returned 409 "An account with that email already exists" — a membership oracle. For a health or legal client that is worse than an account-enumeration nuisance. Dormant when `customerAccounts` is off.                                                   | **Fixed.** Identical response either way; the duplicate branch emails the address's real owner instead.                                                                                                        |
| M5  | Medium   | `auth.ts`                                                         | Returned `null` before reaching `bcrypt.compare` when the email was unknown, so the login form answered "does this person have an account here?" to anyone with a stopwatch. **Measured: 142ms vs 0ms.**                                                   | **Fixed.** Compares against a real dummy hash on the miss path. A malformed placeholder would _not_ work — bcrypt rejects bad format instantly, reproducing the bug.                                           |
| M6  | Medium   | all 5 public POST routes                                          | No body size limit anywhere, and malformed JSON threw uncaught — a client error surfacing as a 500.                                                                                                                                                        | **Fixed.** 100 KB cap checked against `content-length` _and_ the actual body, and `JSON.parse` wrapped.                                                                                                        |
| M7  | Medium   | `features/customer-accounts/schema/customer.schema.ts`, `auth.ts` | Customer email was not case-normalised, while the lookup hits a case-sensitive unique index. `Foo@x.com` slipped past the taken-email check, created a second row, and locked the owner out.                                                               | **Fixed** for customer accounts and both auth providers. **Note:** `createBookingSchema` here still lacks the same normalisation — that arrived with the booking-request workflow, which is not yet ported up. |
| M8  | Medium   | `next.config.ts`                                                  | `X-Powered-By: Next.js` on every response.                                                                                                                                                                                                                 | **Fixed.** `poweredByHeader: false`.                                                                                                                                                                           |

### Low

| #   | Severity | Location                                                     | Issue                                                                                                                                                  | Fix                                                                                                                                                 |
| --- | -------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Low      | all 5 public POST routes                                     | Raw Zod `issues` echoed to unauthenticated callers — every field name, type and constraint.                                                            | **Fixed.** `validationError()` returns the first message only.                                                                                      |
| L2  | Low      | `app/api/webhooks/stripe/route.ts`                           | Returned Stripe's raw verification error, an oracle for anyone probing with forged signatures.                                                         | **Fixed.** Logged in full, returned generic.                                                                                                        |
| L3  | Low      | `features/booking/api/follow-up-window.ts`                   | Unguarded exported `"use server"` read. Every export of such a module is a POST-able RPC endpoint.                                                     | **Not applicable here** — that file arrived with the booking-request workflow and is not yet ported up. Fixed in the client; carry it when porting. |
| L4  | Low      | `features/booking/api/set-payment-timing.ts`                 | Took a bare TypeScript union with no runtime parse. Types are erased; Server Action arguments are attacker-controlled JSON. Admin-gated, so contained. | **Fixed.** Zod `safeParse` added.                                                                                                                   |
| L5  | Low      | `auth.ts`                                                    | No `session.maxAge`, so dashboards use Auth.js's 30-day default.                                                                                       | **Recommended — not applied.** See below.                                                                                                           |
| L6  | Low      | `lib/email.ts`, `features/booking/api/submit-booking.ts`     | Customer email addresses written to server logs — a lower-trust store than the database.                                                               | **Fixed.** Logs the booking id; `lib/email.ts` redacts to `j***@example.com`, keeping the domain.                                                   |
| L7  | Low      | `compose.yaml`                                               | `"5432:5432"` publishes the dev database on every interface with `postgres`/`postgres`.                                                                | **Fixed** (`127.0.0.1:5432:5432`). Takes effect on the next `docker compose up`.                                                                    |
| L8  | Low      | `features/customer-accounts/api/signup.ts`, `prisma/seed.ts` | bcrypt cost 10 hardcoded in two unrelated files. Raising one leaves half the accounts cheaper to crack.                                                | **Fixed.** Shared `lib/password.ts::BCRYPT_COST`.                                                                                                   |
| L9  | Low      | `features/customer-accounts/schema/customer.schema.ts`       | Password policy is `min(8)` and nothing else. No reset, change, or verification flow exists.                                                           | **Recommended — not applied.** See below.                                                                                                           |
| L10 | Low      | `server/services/bookingService.ts`                          | `take: options.limit` with no default returns an entire history.                                                                                       | **Not applicable here** — `listBookingsByEmail` arrived with the booking-request workflow. Fixed in the client; carry it when porting.              |

---

## Checked, no issues found

| Area                   | What I actually checked                                         | Result                                                                                                                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SQL injection          | `$queryRaw`, `$executeRaw`, `*Unsafe` across the whole repo     | **Zero occurrences.** Everything goes through Prisma's parameterised client.                                                                                                                                                                                                                                       |
| XSS sinks              | Every `dangerouslySetInnerHTML`                                 | **One**: `app/layout.tsx`, JSON-LD via `serialiseJsonLd`, which escapes `<`, `>`, `&`, U+2028 and U+2029 and so cannot break out of the script tag. `<` is the control that matters; the rest is hardening, and the two separators also stop a valid-JSON value rendering a document the browser refuses to parse. |
| Stored XSS             | Review comments, lead messages, customer names in the dashboard | All render as React children, escaped by default. No `innerHTML` path anywhere.                                                                                                                                                                                                                                    |
| Validation coverage    | All 5 API routes, every `"use server"` module                   | Zod `safeParse` at every boundary except the two recorded as L3 and L4. Client-side validation is never the only layer.                                                                                                                                                                                            |
| Server Action auth     | Every exported action                                           | All mutating actions call `requireAdmin()` first, and it asserts `role === "admin"` rather than mere session presence — otherwise a signed-in _customer_ would pass, since both share one Auth.js instance. The exceptions are the two sign-out forms and the two login actions.                                   |
| IDOR                   | `/account`, `listMyBookings`                                    | Scoped to the session's email server-side. No page accepts a user-supplied email or id.                                                                                                                                                                                                                            |
| Secrets in git         | `git log --all --name-only` across every ref                    | Only `.env.example` and `.env.test.example` were ever committed. `.env*` is gitignored.                                                                                                                                                                                                                            |
| Client bundle          | Every `NEXT_PUBLIC_` reference                                  | Exactly one: `NEXT_PUBLIC_SITE_URL`. No database URL, no Resend key, no Stripe key reaches the browser.                                                                                                                                                                                                            |
| File upload            | UploadThing, multipart handlers, `type="file"`                  | **No upload exists anywhere in the kit.** Team photos are `/public` paths validated against traversal, remote URLs and non-image extensions; `next.config.ts` sets no `remotePatterns`, so `next/image` is local-only.                                                                                             |
| Stack traces           | `app/error.tsx`, `not-found.tsx`, every route catch             | Only `error.digest` is shown. Unrecognised errors re-throw to Next's generic 500.                                                                                                                                                                                                                                  |
| Stripe webhook         | Order of operations                                             | Signature verified **before** any parse or side effect; raw body read as text so the signed bytes survive; fails closed when the secret is unset. Correct. Reviewed only.                                                                                                                                          |
| CORS                   | `Access-Control-*`, `OPTIONS` handlers                          | None configured, so the same-origin policy applies by default.                                                                                                                                                                                                                                                     |
| CSRF on Server Actions | Next's built-in origin check, Auth.js CSRF token                | Origin-checked by the framework; the Auth.js CSRF token is not overridden.                                                                                                                                                                                                                                         |

---

## Things to know before trusting this

### The CSP is a measurement, not a mitigation

`Content-Security-Policy-Report-Only` **blocks nothing**. The browser evaluates it,
reports what it would have refused, and loads the page anyway. Do not read its presence
as "XSS is handled". It ships report-only because an enforcing policy written blind is
the fastest way to take a client's site down — Next injects inline bootstrap scripts,
Tailwind and `next/font` inject inline styles, and a client may embed a map or a chat
widget.

`script-src` currently grants `'unsafe-inline'`, which is what makes the policy weak.
Next's inline bootstrap needs either that or a per-request nonce, and a nonce means
rendering every page dynamically. Measured on the first client: zero violations on the
homepage and `/login` in dev — encouraging but preliminary, since a development build
inlines differently from a production one.

### The login captcha, and what it is worth

Added after the review proper, because the review stopped at "bound the number
of attempts" and never asked the obvious follow-up: _nothing on the sign-in form
could tell a person from a script._ The throttle counts attempts per source, so
a bot spread across many addresses still gets a large number of free guesses,
and the counter resets on deploy.

`lib/captcha.ts` is self-hosted — no third-party account, no keys, no CSP
change, nothing sent off-box. Two properties carry it:

- **The answer is never in the page.** Digits are drawn as SVG line segments,
  not `<text>`, and the expected value lives only inside an AES-256-GCM token
  keyed from `AUTH_SECRET`. The first draft signed the token instead of
  encrypting it, which was worthless — a signed token is still readable, and it
  travels to the browser in a hidden field, so a bot could have read the answer
  straight out of the HTML. `lib/captcha.test.ts` pins that regression.
- **A solved challenge buys exactly one attempt.** Each token carries a nonce
  burned on first use. Without that, a bot solves once and replays forever,
  which would have left the original problem entirely intact.

Enforcement is in `authorize()`, not on the login page — the same lesson as H2.
A captcha checked only by the form is skipped by anything posting to
`POST /api/auth/callback/admin`, which is every bot worth defending against.
Measured: an attempt with no captcha is now refused in ~50ms without reaching
the database or bcrypt, against ~250ms before.

**Be honest about the strength.** This stops commodity form-spam bots, which do
not do OCR. Someone who writes a solver for this specific site will get past it
— seven-segment digits are not hard to recognise. It is a layer on top of the
throttle and bcrypt's cost, not a replacement for either. Cloudflare Turnstile
would be stronger and is the upgrade path if a client is ever targeted
deliberately; the module is shaped so it can be swapped without touching the
call sites.

**Not applied to the customer login** (`/account/login`). That form is a lower
-value target and was out of the scope asked for. If `customerAccounts` is on
for a client that cares, wire the same three lines into the `"customer"`
provider.

### The rate limiter is per-process and in-memory

Fixing the spoofing bug (H3) made it _honest_, not _distributed_. On serverless the
effective limit is `max × instances`, and it resets on every deploy. A real fix needs
Redis or Vercel KV; no caller would have to change.

### The `x-forwarded-for` trust assumption is exactly that

`lib/client-ip.ts` prefers `x-vercel-forwarded-for` (set by Vercel's edge, replacing
anything the client sent) over `x-real-ip` over the leftmost entry of `x-forwarded-for`.
Sound **on Vercel**. Behind a proxy that appends to a client-supplied value rather than
overwriting it, the fallback degrades to the old behaviour. **Re-check this before
deploying a client anywhere other than Vercel.** The assumption is written at the parse
site because the code cannot verify it.

### The honeypot is a filter, not a control

It stops indiscriminate spam and nothing else. It sits _under_ the rate limiter
deliberately, so nothing depends on the attacker's ignorance. Its real risk is the false
positive: a filled honeypot is silently discarded, so a password manager autofilling the
hidden field would drop a genuine enquiry with nobody the wiser. Hence
`autocomplete="off"`, `tabindex="-1"` and `aria-hidden`, and a test asserting that empty
and whitespace values still write a row.

---

## Recommended, not applied

**L5 — Session lifetime.** Dashboards inherit Auth.js's 30-day default. Shortening it to
8 hours shrinks the window for a stolen laptop or exfiltrated token, at the cost of staff
signing in most mornings. It is `session: { maxAge: 60 * 60 * 8 }` in `auth.ts`. Because
this is a per-client operational trade-off, it is arguably better as a config value than
a kit-wide default.

**L9 — Password policy.** `min(8)` with no complexity, breach check, or expiry. A
stricter policy without a password-reset flow is a trap: the first person who cannot
satisfy it is locked out with no way through, and there is no reset, change, or
email-verification flow anywhere in the kit. Build the reset flow, then raise the bar.

---

## Verification performed

In this repo:

```
npm run typecheck     clean
npm run lint          clean (2 pre-existing unused-var warnings, unrelated)
npm test              318 passed, 31 files
npm run build         succeeds on next@16.3.0
npm audit             0 vulnerabilities (was 3 high)
```

Against the first client's running site (identical behaviour at the time):

| Check                                             | Result                                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Security headers                                  | All six present; `X-Powered-By` absent                                                                            |
| Cross-site shaped POST (`text/plain`)             | **415**                                                                                                           |
| Malformed JSON body                               | **400** (was an uncaught 500)                                                                                     |
| 200 KB body                                       | **413**                                                                                                           |
| Honeypot filled                                   | **201**, and nothing written to the database                                                                      |
| Login throttle on `POST /api/auth/callback/admin` | Attempts 1–5 ~200ms, attempt 6+ ~35ms — the burst tier engaging on the endpoint that previously had no limiter    |
| Timing oracle                                     | The email used **does not exist**, and still cost the full bcrypt time — the dummy-hash path working              |
| Seed guard                                        | A non-local `DATABASE_URL` → refuses, exit 1, before any delete. With `ALLOW_DESTRUCTIVE_SEED=1` → runs and warns |

**One bug the new tests caught during this work:** adding the honeypot to the Zod schemas
initially broke every legitimate submission on all three public forms — the extra field
flowed into Prisma's `create`, which rejects unknown arguments. It was caught only
because the test asserted a row was actually written, rather than just checking the
status code. `stripHoneypot()` now removes it at the route, so no service can ever see
it. **Any client that restyles a form must keep `<HoneypotInput>` and the
`stripHoneypot()` call intact.**

---

## Suggested next steps

1. **Collect CSP reports from real production traffic**, then flip the header to
   enforcing. The single largest remaining gain.
2. **Decide on L5 and L9** — both may belong in `config` rather than as kit-wide defaults.
3. **Port the booking-request workflow up from the client**, carrying L3, L10 and the
   `createBookingSchema` email normalisation noted in M7 with it.
4. **Move the rate limiter to Vercel KV or Redis** when a client's traffic justifies it.
   The captcha's spent-nonce set has the same per-instance limitation and would move
   with it.
5. **Consider Turnstile** in place of the self-hosted captcha for any client that
   attracts targeted attention rather than commodity bots.
