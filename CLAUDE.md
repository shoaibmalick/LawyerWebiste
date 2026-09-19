# CLAUDE.md

## Project Overview

This repo is **Harbourline Law Group LLP** — a demo marketing website for a fictional
cross-border law firm with offices in Toronto and New York, serving both businesses (B2B)
and individuals (B2C). It was cloned from the `website-starter-kit` template and is now a
**standalone repo**: there is no `upstream`, no drift check, and no merge-down workflow.
The "Template vs Client Repo" section below is retained for the reasoning it records, but
its mechanics no longer apply here.

**`specification.md` in the repo root is the contract.** This project follows spec-driven
development: the spec is edited before the code, and a change that contradicts it is a bug
in one of the two. Read it before starting any phase.

### What this build adds on top of the kit

- **Practice-area content model** — `config/schema/practice-area.schema.ts` plus
  `config/content/practice-areas/{business,individual}.ts`: 12 categories, 48 services,
  each with slug, summary, description, 4 key features, 3 FAQs, jurisdictions and SEO
  metadata. Authored in `BusinessToBusinessContent.md` and `BusinessToCustomer.md` in the
  repo root, which remain the source of truth for the copy.
- **Multi-page marketing site** — the kit is a single long homepage; this is ~62 routes
  under `/business/[category]/[service]` and `/individuals/[category]/[service]`.
- **Practice-area CMS** — `features/practice-areas/` plus a `PracticeAreaOverride` table,
  following the `TeamMember` precedent: config stays the source of truth and the DB holds
  only owner-editable presentation (visibility, featured, order, two text overrides).
- **Extended leads** — `audience`, `practiceAreaSlug`, `serviceSlug` and `jurisdiction` on
  `Lead` and `createLeadSchema`, all optional, all validated against config server-side.
- **A logo, derived rather than hand-cut** — `business.logo` in `config/site.config.ts`
  names a mark, a lockup and a reversed lockup; `npm run logo:generate`
  (`scripts/extract-logo.mjs`) produces all of them, plus the app icons and the share card,
  from `design/harbourline-logo-source.jpeg`. **Never hand-edit anything under
  `public/images/brand/`, `app/icon.png`, `app/apple-icon.png` or `app/favicon.ico`** —
  re-run the script. The source is the render the client supplied, kept outside `/public`
  so it is not served; the script matts the logo off its printed background and prints the
  crop it found, which is why `config/logo.test.ts` asserts the declared sizes still match
  the files. See `specification.md` 7.8 for the two decisions the matte depends on.
- **Graded hero photography, and a contrast check that is not axe** — the three hero
  frames are published darker than they were licensed. `npm run hero:grade`
  (`scripts/grade-hero-images.mjs`) reads `design/hero-source/` and multiplies each frame
  to a common 99th-percentile luminance; **never hand-edit `public/images/hero/`**, it is
  output. `npm run check:hero-contrast` (`scripts/check-hero-contrast.py`, needs
  `pip install playwright pillow`) then measures every text run in the hero against the
  composited pixels behind it, because **axe cannot do this** — faced with text over an
  image it reports `incomplete`, not a violation, so a 0-violation audit says nothing about
  the one place on the site where contrast is genuinely at risk. It has caught a lead
  paragraph at 4.16:1 that had been shipping since the photography landed. Run it after
  touching the scrim, the hero copy, or the photographs — **including the copy**, because
  shorter headline text means fewer lines, which moves every run to a different part of the
  photograph. See `specification.md` 7.11–7.14.
- **A third motion primitive** — `components/motion/rotating-word.tsx`, beside `reveal.tsx` and
  `hero-slideshow.tsx`. One word of the hero headline cycles. Two rules it shares with the other
  two: the timer never starts under `prefers-reduced-motion` (the finished state, not a faster
  animation), and both branches carry `data-reveal` with distinct React keys — see `reveal.tsx`
  for why that is load-bearing. Its pure helpers live in `lib/word-list.ts` and **must stay
  there**: the hero is a Server Component, and every export of a `"use client"` module is a
  client reference that a server component cannot call.

### Demo safeguards — do not remove

The firm is fictional. `app/robots.ts` disallows everything, the invented business facts
are passed to `buildLocalBusinessSchema` as `provisional` so a real public deploy throws
rather than publishing a fake firm to search engines, and a disclaimer renders in the
footer and on every practice-area page. See `specification.md` 1.3.

### Database

**Neon Postgres**, not the local Docker container. Two URLs: `DATABASE_URL` (pooled) for
the app runtime via `lib/prisma.ts`, and `DIRECT_DATABASE_URL` (unpooled) for the Prisma
CLI via `prisma.config.ts` — Neon's pooler cannot serve `prisma migrate`. The local Docker
Postgres in `compose.yaml` is retained **for the test database only**; `.env.test` must
never point at Neon, because the integration tests truncate tables. See
`specification.md` 2.4.

## Tech Stack

Next.js 16 (App Router, Turbopack) + TypeScript strict · Tailwind CSS v4 + shadcn/ui
(`base-nova` style) · Zod · Prisma 7 + PostgreSQL · react-hook-form + `@hookform/resolvers`
· Resend and `nodemailer` (two selectable mail transports — see the admin email note;
`nodemailer` is pinned to `^9` via an `overrides` entry, because `^8` carries
GHSA-p6gq-j5cr-w38f and `npm audit` is a CI gate, while `@auth/core` declares a
`peerOptional` on `^7 || ^8` that would otherwise block a clean install. It needs
`@types/nodemailer` because it ships none of its own)
· Auth.js v5 (`next-auth@beta`) + `bcryptjs` · Stripe · `@anthropic-ai/sdk`
· `react-day-picker` v10 (booking calendar; wrapped in `components/ui/calendar.tsx`, whose
stylesheet is deliberately **not** imported — it ships its own colours, and the wrapper
maps everything onto theme tokens instead) · `lucide-react`
· Framer Motion, UploadThing — not yet installed, added when a feature actually needs them.

**ai-chatbot note:** deliberately scoped as a simple FAQ bot, not RAG — no document
upload, chunking, embeddings, or vector search. `features/ai-chatbot/api/build-system-
prompt.ts` builds the system prompt directly from `siteConfig` + `services` + `team`
(the same structured data the rest of the site already renders from); the model
answers only from that context and is told to say so and point to the phone/contact
form when it doesn't know something. Uses `claude-opus-4-8` at `output_config: {effort:
"low"}` (a simple lookup/chat task doesn't need higher effort or thinking). Widget is
mounted site-wide in `app/layout.tsx`, not just the homepage. `lib/anthropic.ts` follows
the `lib/email.ts` pattern (null-if-unconfigured), not the `lib/stripe.ts` one — an
unanswerable chat is a soft failure (fallback message directing to phone/contact form),
never a hard error.

**Payments note:** per-service `depositAmount` (cents, in `config/content/services.ts`)
is the pricing decision an agency sets; **when** it's collected is a business-operational
choice the client can flip themselves at `/dashboard/settings` (`PaymentSettings` —
`UPFRONT` vs `AFTER_SERVICE`, DB-backed, not config, since config requires a redeploy to
change and this shouldn't). `UPFRONT` creates the booking as `PENDING_PAYMENT`, opens a
Stripe Checkout Session, and confirms via `app/api/webhooks/stripe/route.ts` on
`checkout.session.completed` (idempotent — re-delivered events are safely a no-op).
`AFTER_SERVICE` confirms the booking immediately with no Stripe involvement at booking
time; staff mark it paid in person from `/dashboard/bookings`. Stripe credentials are configured by the business at
`/dashboard/settings` — encrypted on `PaymentSettings` via `lib/secret-box.ts`, resolved by
`lib/stripe-config.ts` (the **second** sanctioned `lib/` → `server/services/` import), and
falling back to the env vars so an un-updated deployment behaves as before. `lib/stripe.ts`
exports `getStripe()`/`requireStripe()` rather than a module-level constant, because the key
now comes from the database and cannot be read at import time. It resolves to
`null` when no key is configured anywhere — unlike `lib/email.ts`, callers must treat that
as a hard error (503) when a deposit is actually required, never silently skip payment
collection. A `PENDING_PAYMENT` booking does NOT hold the slot's capacity (only
`CONFIRMED` bookings count, see `bookingService.listAvailableSlots`) — a deliberate
simplification; a real reservation/expiry mechanism for abandoned checkouts isn't built.

**Auth.js v5 note:** two entirely separate credential spaces share one NextAuth instance
via two Credentials providers with explicit ids — `"admin"` (backed by `AdminUser`, a
bcrypt hash, single/few admins per client) and `"customer"` (backed by `Customer`, the
optional `customerAccounts` feature). Neither uses the Auth.js Prisma adapter's User/
Account/Session schema — that's built for multi-provider OAuth we don't need. A
`role: "admin" | "customer"` is threaded through in the `jwt`/`session` callbacks (typed
via `types/next-auth.d.ts` module augmentation — note the `session` callback casts
`token.role` explicitly with a comment, because TS doesn't infer through that
augmentation cleanly here) so `proxy.ts` and pages can tell the two apart. Session
strategy is `jwt` (required for Credentials). Root config lives in `auth.ts`, exporting
`{ handlers, auth, signIn, signOut }`; `app/api/auth/[...nextauth]/route.ts` re-exports
`handlers`. `signIn("admin", {...})` / `signIn("customer", {...})` — the provider id is
the first argument, not optional once you have more than one. Route protection is
`proxy.ts` (see the Next.js 16 caveat below — this is the renamed `middleware.ts`),
wrapping `auth()` and checking `req.auth?.user?.role` directly (not the `authorized`
callback) against `/dashboard/:path*` (must be `"admin"`) and `/account/:path*` excluding
`/account/login`+`/account/signup` (must be `"customer"`). This protects Server Actions
too, since a Server Action's POST targets the same path as the page it was rendered
from. Every admin Server Action still re-checks the session itself via
`lib/auth-guards.ts::requireAdmin` — defense in depth, don't rely on `proxy.ts` alone.
Note it asserts `role === "admin"`, not merely that a session exists: because admin and
customer share this one instance, a signed-in _customer_ satisfies a bare `if (!session)`
check, which is exactly the hole all six admin actions used to have.
The seed script creates one dev-only admin user from `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` env vars — never hardcode real credentials in seed data.

**Tailwind v4 note:** there is no `tailwind.config.ts` — v4 is CSS-first, configured via
the `@theme` block in `app/globals.css`. Per-client theming (still build-time, per the
architecture decision) is implemented as: `config/theme.config.ts` (Zod-validated design
tokens) → `lib/theme.ts::themeConfigToCssVars` → applied as an inline `style` on
`<html>` in `app/layout.tsx`, overriding the CSS custom properties shadcn defined in
`:root`. Edit `theme.config.ts` per client, not `globals.css`. Font family is
per-client too, but through a different mechanism: `next/font/google` requires a
static import per font, so `theme.config.ts`'s `fontSans` is a closed enum
(`"geist" | "plusJakartaSans"`, defaulting to `"geist"`) rather than an arbitrary
Google Font name — `app/layout.tsx` imports both and picks one via that value. Adding
a third option means importing it in `layout.tsx` and extending the enum, not editing
a client repo's copy of `layout.tsx` directly. A font object's `.variable` property is
a generated class name for `className`, not the CSS variable name itself — don't pass
it to `var()` directly (see the `SANS_FONT_VARS` literal map in `layout.tsx`); doing so
silently produces an invalid `--font-sans` and falls back to the browser default,
which is exactly the bug Milestone 5 caught (Geist had never actually been applied to
body text — `globals.css`'s `--font-sans: var(--font-sans)` was self-referential until
`layout.tsx` started actually setting the plain `--font-sans` var).

**Prisma 7 note:** the datasource block in `schema.prisma` has no `url` — Prisma 7 moved
CLI connection config to `prisma.config.ts` (loads `.env.local` itself via `dotenv`, since
the CLI runs outside Next's own env loader). The generated client is TS source output to
`/generated/prisma` (gitignored, regenerated by `prisma generate`, wired to run
automatically via the `postinstall` script) — NOT the old `node_modules/.prisma/client`
location. `PrismaClient` also now requires an explicit driver adapter at construction
(`@prisma/adapter-pg`, see `lib/prisma.ts`) rather than reading `DATABASE_URL` on its own.
Local dev DB is a Docker Compose Postgres container (`compose.yaml`) — run
`docker compose up -d` before `npm run dev` or any `prisma migrate`/`db seed` command.
`prisma migrate dev` refuses to run at all (not even `--create-only`) in a non-interactive
shell if it has ANY warning to show (e.g. adding a unique constraint) — even a harmless
one, even with zero conflicting rows. When that happens: hand-write the migration folder
(`prisma/migrations/<timestamp>_<name>/migration.sql`, matching the SQL Prisma would have
generated — check an existing migration for the dialect/formatting) and apply it with
`prisma migrate deploy`, which doesn't do the interactive shadow-DB diff.

**Next.js 16 caveat:** this version may have breaking changes vs. older Next.js
conventions in training data. Read `node_modules/next/dist/docs/01-app/` before writing
App Router code and heed deprecation notices — see `AGENTS.md` for the same reminder
(Next.js's own convention, referenced from this file via the `@AGENTS.md` mechanism
elsewhere; kept here as an explicit prose note too). Same caution applies to Prisma 7 and
Auth.js v5 (beta) — both newer than a lot of training data; verify against the actual
installed package (`node_modules/prisma`, `node_modules/@prisma/client`,
`node_modules/next-auth`) before assuming an older convention holds. Concretely:
`middleware.ts` is renamed `proxy.ts` (named export `proxy`, not `middleware`) — old
Auth.js docs/examples showing `middleware.ts` need that rename applied.

**Dynamic rendering:** any page that reads live DB state (e.g. the homepage's booking
availability) must opt out of static prerendering with `export const dynamic =
"force-dynamic"` — Next.js has no way to detect that a plain Prisma call inside a Server
Component is "dynamic" the way it detects `cookies()`/`headers()`, so an unmarked page
will silently get prerendered once at build time and serve stale data forever after.

**Admin email note:** the business configures its own mail transport at
`/dashboard/settings` — Resend, generic SMTP, or `SERVER` (the `RESEND_*` env vars,
still the default, so an un-updated deployment behaves exactly as before). Staff compose
and send from a Booking or Lead row, and every attempt is recorded in `MailMessage`.
Five things a rewrite must keep:

- **`sendEmail` returns `{delivered}`, not `void`.** It resolves without sending when no
  transport is configured, and callers act on the difference — `confirmBookingAction` and
  the Stripe webhook only set `confirmationEmailSentAt` when something actually left,
  because that column is what lets a retry re-attempt. Marking it unconditionally is the
  bug this type exists to prevent. Only "no transport at all" fails soft; a _configured_
  transport that fails throws, so staff can be told.
- **There is no `to` field in the send schema.** The recipient is re-derived server-side
  from the booking or lead. Not validated — _absent_, so an admin session cannot be used
  as an open relay against a domain carrying the business's SPF and DKIM.
- **Stored credentials are encrypted** (`lib/secret-box.ts`, AES-256-GCM off
  `AUTH_SECRET` via HKDF with its own `info` string — see `lib/captcha.ts` for why the
  binding matters). Its `KEY_SALT` is deliberately client-neutral: a per-repo string
  would make the template and each client derive different keys, and a merge would
  quietly make every stored credential unreadable. Secrets never go back to the browser —
  the settings view carries booleans. Blank means "keep", and an explicit `Clear`
  checkbox is the only way to remove one.
- **`lib/email-config.ts` is the one `lib/` → `server/services/` import in the repo.**
  Deliberate, and in its own file so `lib/email.ts` stays a database-free unit test with
  exactly one seam to mock. It never throws: every failure falls back to the environment.
- **`lib/email-shell.ts` escapes before it adds markup**, and hardcodes colours and sizes
  in inline `style` attributes. Both are load-bearing. Inverting the first turns a typed
  `<a href>` into a working link in a message from the business's own domain; "fixing" the
  second with theme tokens renders as unstyled text in half the world's mail clients.

Canned templates live in `config/content/email-templates.ts`, not a table — the body is
fully editable at send time, so the owner is never blocked on a redeploy, and a config
file lets `superRefine` reject a placeholder the code cannot fill. If a client ever needs
to edit them, the upgrade path is the one `TeamMember` took: a table seeded from this file
on first read.

**Touch targets note:** `components/ui/button.tsx` carries
`pointer-coarse:min-h-11 pointer-coarse:min-w-11` (44px) on its base classes, and
`components/ui/field.ts` exports the one `FIELD` constant every admin form control uses —
`min-h-11` plus `pointer-coarse:text-base`, because **iOS Safari zooms the page whenever a
focused input is under 16px**. Both are gated on the input device rather than applied
unconditionally: the admin sizes are built for a cursor, and growing them everywhere would
mean redesigning every dashboard row to fix a problem desktop does not have. Do not
re-introduce a per-component `const FIELD`; there were five identical copies and none of
them set a height.

**Client-editable settings note:** `/dashboard/settings` is an ungated hub where the
business owner changes things the agency would otherwise have to redeploy for — the
site's palette and the team roster. Two feature slices back it,
`features/site-settings` and `features/team`, plus `SiteSettings` (singleton row, id 1)
and `TeamMember` in Prisma. Do **not** gate that page on a feature flag:
`featuresConfigSchema` is bare booleans with no defaults, so a new flag hard-fails
`featuresConfig.parse` in every client repo that hasn't merged it yet. The payments
block gates itself _inside_ the page instead.

Theming is three palettes rather than one. `config/theme.presets.ts` holds them;
`BRAND` aliases the client's own `config/theme.config.ts` (still the one hand-edited
brand file), and `MIDNIGHT`/`HARBOUR` override only `colors` — typeface, radius and
any tokens a client has added stay the brand's in all three, because presets are built
by spreading the brand config rather than by listing fields. `app/layout.tsx` reads the
stored choice and emits that palette's vars. Adding a palette means: an entry here, a
value in the Prisma `ThemePreset` enum (`theme.presets.test.ts` asserts they match),
and passing the contrast assertions in that same test.

**Nothing is cached, deliberately.** `getActiveTheme` and `listTeam` both call
`connection()`, so every route under the root layout renders per-request — which is why
`/credits`, `/login` and the booking result pages are no longer prerendered. That was
chosen over `unstable_cache`: Next 16 supersedes it with `use cache` (needing
`cacheComponents` app-wide) and changed `revalidateTag` to require a revalidation
profile, with the docs now describing tags in terms of `use cache`/`fetch`. An
invalidation path that uncertain fails as "the client changed their theme and nothing
happened". Both reads also fail soft to config, so a build with no reachable database
still produces a correct-looking site. If caching is revisited, do it as a deliberate
Cache Components migration, not a patch.

**Singleton rows need a retry.** Prisma's `upsert` does not always compile to a single
`INSERT … ON CONFLICT`; when it degrades to find-then-create, two concurrent callers
both find nothing and both insert. This is not theoretical — it threw on an ordinary
page load, because the root layout's theme read runs in parallel with the homepage's
roster read and both materialise `SiteSettings`. Both `siteSettingsService` and
`settingsService` catch `P2002` and re-read. Any new singleton must do the same, and
its test must exercise concurrent first reads: the sequential tests passed throughout.

**Admin list mutations note:** a dashboard row action is a **client list component**
(`review-moderation-list.tsx`, `lead-list.tsx`, `booking-list.tsx`) calling an action that
returns `{ ok: true; message } | { ok: false; error }`, then `router.refresh()`. It is not
an inline `"use server"` closure in a `<form>`. That older shape is why every dashboard
button appeared dead: the action returned `void` and revalidated nothing, so the mutation
landed and the screen did not change until a manual reload — and `force-dynamic` does not
help, because it governs the server Full Route Cache, not the client Router Cache.

Three details that are easy to get wrong and were all found by using the page:

- **Render the status line and the empty state in the same component**, and never behind
  an early `return` on `items.length === 0`. Acting on the last row empties the list, so
  an early return unmounts the confirmation at exactly the moment it matters most —
  deleting the final pending review confirmed nothing at all.
- **Clear every piece of row-scoped state in the transition's final step.**
  `router.refresh()` re-renders the server component but the client instance survives, so
  a `confirmingDeleteId` left set stays armed after the rows reorder and the next click
  hits a different record.
- **Destructive actions get a two-click inline confirm**, with the confirm button rendered
  to the _right_ of the button that armed it, so a double-click cannot carry through. Not
  `window.confirm` — it is unstyleable (so it cannot use the theme tokens), blocks the
  main thread, and sits awkwardly inside a transition.

Use the `Button` primitive (`variant="ghost"` for neutral, `"destructive"` for
destructive) rather than a raw `<button className="… underline">`. The primitive already
carries hover, focus-visible and disabled states; the hand-rolled version had no hover
rule at all, which is most of why the buttons felt unresponsive.

**Filtering and `searchParams` note:** filter forms are `next/form` with `action=""` — a
server component, no client bundle, works with JS off, and the URL holds the state so it
is shareable and survives Back. Two traps: `key` is unsupported on `<Form>` with a string
action, so wrap the fields in a keyed `<div>` inside it or the inputs keep their old text
after a client-side navigation; and "Clear filters" must be a `<Link>`, since
`type="reset"` restores defaults without navigating.

**Filter in the query, never over the fetched rows.** Both list services cap at 100, so a
client-side filter would search only the most recent page and silently miss older records
— an admin searching a customer's email would conclude the message was never received.
`leadService.test.ts` pins this with a filter that finds a row beyond the cap. `total`
keeps meaning "every row" and `matching` is the filtered count; a single number would be
a lie half the time.

Next 16 made `searchParams` a Promise. Annotate it explicitly rather than using the
generated `PageProps<'/…'>` helper — `.next/types` does not exist on a clean checkout and
would break `typecheck` before the first build:

```tsx
export default async function Page({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;   // repeated keys arrive as arrays
```

**Review states:** `PENDING | APPROVED | HIDDEN`. Rejecting used to delete the row
outright; it now hides it reversibly, and delete is a separate action behind a confirm. A
third status rather than a boolean or a `hiddenAt` column because every public read
already filters `status = APPROVED` — a hidden review is excluded by a condition that
exists rather than one each future query must remember to add. `listApproved` therefore
takes **no status argument**, and `reviewService.test.ts` carries a regression test named
for the risk. There is deliberately no transition back to `PENDING`.

## Testing

Vitest (`vitest.config.mts`, Node environment). Tests are colocated `*.test.ts` files
next to the code they cover — no separate `/tests` tree. Three layers, no strict
boundary enforced between them beyond convention:

- **Unit** — pure logic and Zod schemas (`lib/rate-limit.test.ts`,
  `config/schema/*.test.ts`, `features/*/schema/*.test.ts`,
  `features/quote-calculator/api/calculate-estimate.test.ts`). No DB, no mocks needed.
- **Service-layer integration** — `server/services/*.test.ts` (e.g.
  `bookingService.test.ts` covers capacity enforcement, cancellation,
  `PENDING_PAYMENT` exclusion from capacity, idempotent `confirmBookingPayment`). These
  hit a real Postgres database — never mocked — because Prisma's query behavior
  (transactions, unique constraints, isolation level) is exactly what's under test.
- **Route handler integration** — `app/api/*/route.test.ts`. Call the exported `POST`/
  `GET` directly with a real `Request`; also hit the real test database.

**Isolated test database, never the dev one.** Integration tests call
`prisma.<model>.deleteMany()` in `beforeEach`/`afterAll`, which would destroy real dev
data if pointed at the wrong DB. `.env.test` (gitignored; copy from `.env.test.example`)
sets `DATABASE_URL` to a separate `website_starter_kit_test` database, created
automatically alongside the dev DB via `docker/init-test-db.sql`
(`docker-entrypoint-initdb.d`, so a fresh `docker compose up -d` creates both DBs with
zero manual steps). Run `npm run test:db:setup` once (or after adding a migration) to
apply migrations to the test DB, then `npm test` / `npm run test:watch`.

**Mocking patterns required for route handler tests** (see the two files under
`app/api/*/route.test.ts` for the working examples):

- `vi.mock("next/headers", ...)` — Route Handlers that call `headers()` need Next's
  request-scoped async context, which doesn't exist when the handler is invoked
  directly in a test. Mock it to return a `Headers` object with a unique simulated
  `x-forwarded-for` IP per call (`test-${Math.random()}`) so unrelated test cases never
  collide in the shared in-memory rate limiter; a fixed IP is used only in the one test
  that deliberately exercises the rate limit.
- `vi.mock("@/auth", ...)` — a route file typically imports from its feature's barrel
  `index.ts` (e.g. `@/features/leads`), which also re-exports admin Server Actions
  (`markLeadHandledAction`, `cancelBookingAction`) that import `@/auth` →
  `next-auth`. `next-auth`'s package internals do an extension-less
  `import ... from "next/server"` that Next's own bundler resolves fine but Vitest's
  Vite-based resolver cannot ("Cannot find module .../next/server"). Since the route
  under test never actually calls `auth()` itself, mock `@/auth` to a no-op
  (`auth: vi.fn(async () => null)`) purely to keep the real `next-auth` package out of
  the test's module graph — this isn't testing auth behavior, it's sidestepping a
  resolver incompatibility. Don't "fix" this by importing the route's dependencies from
  deeper, non-barrel paths — that would violate the barrel-only import rule in
  Architecture Rules below for the wrong reason.
- `vi.mock("@/lib/features", ...)` when a route is gated by `isFeatureEnabled` and the
  test needs to exercise both the enabled and disabled path.

**CI** (`.github/workflows/ci.yml`) runs a `postgres:16-alpine` service container, writes
`.env.test` inline (same `DATABASE_URL` shape, pointed at `localhost` since the service
container's port is mapped to the runner host), then runs `npm run test:db:setup` and
`npm test` after lint/typecheck/build.

**Adding tests for a new feature:** unit-test the Zod schema and any pure functions
(pricing math, formatting) with no DB; integration-test the service-layer function
against the real test DB; only add a route handler test if the feature has its own
route handler (some features are Server Actions only and don't need one).

## Architecture Rules

- Server Components by default. Add `"use client"` only where interactivity requires it.
- Feature slices in `/features/*` are self-contained: `components/hooks/api/schema/index.ts`.
  Never deep-import across features — only import another feature's public `index.ts`.
- `/components/blocks` are config-driven: they accept config/content as props/data, and
  never import a specific client's data directly.
- Every feature flag is read through `lib/features.ts::isFeatureEnabled` — never inline
  `process.env` or config lookups elsewhere. Disabled
  features must be unreachable both in the UI (not rendered) and at the route/API level
  (guarded, not just hidden).
- All external input (forms, webhooks, route handlers) validated with Zod at the
  boundary. Types are inferred from Zod schemas, never hand-duplicated.
- No `any`. No unchecked type assertions without a comment explaining why they're safe.

## Security Conventions

Established by the security review of 2026-08-06; the full findings table, the two
recommendations that were deliberately _not_ applied, and the known limitations are in
`SECURITY_REVIEW.md`. All of this is **behaviour**, so it lives here and merges down to
every client.

- **Escape every interpolated value in outbound email** with `lib/html.ts::escapeHtml`.
  React escapes what it renders, so the site itself never needs this; email templates are
  hand-built strings and are the one place raw HTML gets assembled. An unescaped customer
  name is a working link in a message from the business's own domain. Escape at the point
  of interpolation, never at storage — the same value is also rendered by React and read
  back by staff, and double-escaped text in the dashboard is its own bug. `sendEmail`
  strips CR/LF from subjects centrally, so templates don't have to.
- **Every public POST route goes through `lib/api-guards.ts::guardPublicPost`**, which
  does rate limiting, the `application/json` requirement, the body-size cap and the JSON
  parse in one place. Don't reimplement the preamble — five routes had five copies of it
  and the same three gaps in each. Return validation failures via `validationError()`,
  never Zod's raw `issues`.
- **Never key a limiter on a raw header.** `lib/client-ip.ts::clientIp` is the only way to
  derive a caller identity; it prefers platform-set headers and ignores values that aren't
  address-shaped. Read the trust assumption in that file before deploying a client behind
  anything other than Vercel.
- **Public forms carry a honeypot** (`lib/honeypot.ts` + `components/ui/honeypot-input.tsx`).
  A filled trap gets the route's normal success response and writes nothing. Call
  `stripHoneypot()` before passing parsed input to a service — services spread their input
  into Prisma's `create`, which rejects unknown arguments, so forgetting this breaks the
  form outright. A client that restyles a form must keep the `<HoneypotInput>` in it.
- **Escaping happens exactly once, in the shell.** `lib/email-shell.ts::plainTextToHtml`
  escapes and _then_ inserts `<br />`; inverting that escapes the tag instead of the
  content. Admin-composed text is stored as plain text and escaped at render, never at
  storage — the same rule as above, and it is what makes double-escaping structurally
  impossible.
- **Secrets the owner stores go through `lib/secret-box.ts`**, never into a column raw,
  and never back to the browser — send a boolean saying one exists.
- **bcrypt cost comes from `lib/password.ts::BCRYPT_COST`**, never a literal.
- **`auth.ts` must always reach `bcrypt.compare`**, even when the account doesn't exist —
  it compares against `DUMMY_HASH` on the miss path. Returning early is a timing oracle
  that answers "is this person a customer here?" (measured: 142ms vs 0ms). The dummy value
  must be a _real_ bcrypt hash; a placeholder string is rejected instantly and reproduces
  the bug.
- **Login is throttled per source, never per account** (`lib/login-throttle.ts`). Counting
  failures against an email would let anyone lock a client out of their own dashboard on
  demand. Enforcement lives in `authorize()` because that is the only choke point both
  the server action and `POST /api/auth/callback/admin` pass through — `proxy.ts` does not
  match `/api/*`.
- **The admin sign-in carries a captcha** (`lib/captcha.ts`), self-hosted: no third-party
  account, no keys, no CSP change. Two things must not be broken by a rewrite. The token
  is **encrypted** (AES-256-GCM off `AUTH_SECRET`), not signed — it travels to the browser
  in a hidden field, so a merely-signed token would let a bot read the answer out of the
  HTML. And the digits are SVG **line segments, never `<text>`**, for the same reason. The
  nonce is burned on first use, so one solved challenge buys one attempt rather than
  unlimited replays. It is verified in `authorize()` for the same reason the throttle is;
  a captcha checked only by the form is skipped by anything posting to the API directly.
  `app/login/page.tsx` must stay `force-dynamic` — a cached challenge is one everybody
  shares. The server action peeks with `consume: false` so only `authorize()` spends it.
  Honest limits are in `SECURITY_REVIEW.md`: this stops commodity bots, not a solver
  written for this site. Not currently applied to `/account/login`.
- **Uploaded images go in Postgres, never on disk** (`TeamPhoto` +
  `server/services/teamPhotoService.ts`). The deploy target's filesystem is read-only and
  ephemeral, so writing into `/public` works perfectly in local development and then
  silently does nothing in production — the worst failure mode available for "upload a
  photo". Three rules a change must keep: the content type is **sniffed from the bytes**
  (`lib/image-type.ts`), never taken from the filename or the client's `Content-Type`,
  because the stored value is echoed back to visitors as a response header; **SVG is
  refused** on upload even though a hand-typed `/public` path may still be one, since an
  SVG served from our own origin is stored XSS against the admin session that manages the
  page; and the upload happens **before** the roster save, so `TeamPhoto` has no foreign
  key to `TeamMember` and orphans are swept (with an hour's grace) after each save.
- **Phone numbers have one format** (`lib/phone.ts`): `(212)-456-7890`, applied to every
  field the public types a number into — the booking form and the contact form, both of
  which feed the same two schemas. The client masks as you type and the schema validates
  the finished shape, the same split the honeypot and captcha use: a mask is a
  convenience, not a control, since anything can POST to the API directly. The pattern is
  deliberately strict — it rejects a bare `2124567890` as well as `(212) 456-7890` with a
  space — because being lenient server-side while the form is strict just means the
  variants arrive from somewhere other than the form. The field stays **optional**;
  formatting a value is not the same as requiring one. Do **not** apply this to the
  dashboard's lead/booking search box: an admin searching a partial number needs to type
  whatever they remember.
- **The CSP in `next.config.ts` is report-only and therefore blocks nothing.** Do not treat
  its presence as XSS mitigation. Flipping it to enforcing needs violation data from real
  traffic and a decision about `'unsafe-inline'`.

## Template vs Client Repo

This template repo is canonical and lives at `github.com/shoaibmalick/website-starter-kit`
(private). Client repos are clones that keep it as an `upstream` remote — a real URL, not
a local path, so the update workflow works from any machine. In a client repo, `upstream`'s
_push_ URL is deliberately disabled: template changes belong in the template.

The default branch is `master`, not `main`. Merging down is `git merge upstream/master`.

**Behaviour changes go here first, then merge down.** Anything in `/components`,
`/features`, `/lib`, or `/server` that is a fix or a capability — a bug, a new block, a
guard, a feature slice — is written in this repo, committed, and merged into the client.
That is what makes the next client inherit it instead of the work being stranded.

### Divergence is normal; the question is what kind

The original rule said everything outside `/config`, `/prisma/seed.ts` and env vars is
identical across client repos. **That is no longer true, and was never going to survive
a client with its own visual identity.** Smile Studio Dental carries five blocks that do
not exist here (`section`, `services-ledger`, `site-header`, `site-footer`, `gallery`),
nine blocks that differ, and a `globals.css` roughly two and a half times the size of
this one — a whole design system of type scales, fields and motion tokens that is that
client's, not the kit's.

So sort divergence into two kinds before deciding where to write code:

- **Presentation** — class names, layout, copy, a client's own blocks and tokens.
  Expected to diverge, and it will not converge again. Do not try to force a client's
  design back up into the template.
- **Behaviour** — validation, data access, auth, scheduling, anything with a test.
  Must not diverge. If it has, that is a bug to reconcile, not a style choice.

The booking form is the worked example. Both repos run byte-identical schema, submit hook
and calendar logic; only the class names differ, because the client's `field-input`,
`text-small` and Button `size="xl"` exist solely in its own design system. Copying its
markup up here verbatim would have rendered an unstyled form.

**Consequence for merges:** `git merge upstream/master` into a styled client will
conflict on presentation files, and that is the expected outcome rather than a mistake.
Resolve those toward the client (`git checkout --ours <file>`), and resolve anything
behavioural toward upstream. If a behavioural conflict appears, stop — the two repos have
drifted somewhere they should not have.

### Detecting drift that no merge will show you

`npm run check:drift` compares a client's behavioural surface — `lib/`,
`server/services/`, `auth.ts`, `proxy.ts` and `.github/workflows/ci.yml` — against
`upstream/master`, and exits non-zero on anything unexplained. Run it from the client
repo, and pass `-- --fetch` unless you know the remote-tracking ref is current; a stale
`upstream/master` silently answers a question about last week.

**CI runs it on every push**, as the `drift` job in `ci.yml` — so the local command is now
a way to see a failure early rather than the only thing standing between a stranded fix
and the next client. The job lives in the template's workflow and merges down, keeping
`ci.yml` byte-identical across every repo, and self-skips on the template, which has
nothing upstream of it. It authenticates with a read-only deploy key on the template
(`TEMPLATE_DEPLOY_KEY`, one per client) because `GITHUB_TOKEN` only ever reaches the
repository running the workflow; step 2 of the onboarding checklist creates it. When that
secret is missing the job fails rather than skips — a check that quietly passes when it
could not run is worse than none, which is the same reasoning as everything else here.

**Why it compares content rather than history.** The intuitive check is "has this client
merged upstream" — and it does not work. When this was written both clients reported zero
unmerged upstream commits while `lib/structured-data.ts` carried a hardening fix in one of
them and nowhere else. Ancestry only ever detects a client running _behind_ the template.
The failure that has actually happened four times is the opposite: a fix written in a
client, never brought up, invisible to every merge because the client is ahead.

**Why it normalizes before comparing.** A raw byte-diff of the dental client against the
template flags 18 files, 17 of which differ only in client vocabulary inside comments and
test fixtures — "business" became "practice", "customer" became "patient". A report that
is 94% false positives is one nobody reads by the second week. Stripping comments and
collapsing string literals leaves 4. The trade is explicit and stated in the script: a
change to _only_ a comment or _only_ a string is invisible to this check. Prose is
expected to diverge between these repos; behaviour is not.

Findings come in three kinds. `DIVERGED` and `MISSING` fail. `EXTRA` — a file the client
has and the template lacks — never does, because that is the normal case: Golden Fork has
`menuService.ts` because restaurants have menus.

Genuine, permanent divergence goes in a per-client `drift-allow.json` (a JSON array of
`{path, reason}`); **the reason is mandatory and is the entire point of the entry**, since
nothing else distinguishes a considered exemption from one added to turn the build green.
Its granularity is the file, which is its main limitation: when one file holds both a
legitimate client difference and a stranded fix, an entry hides the second along with the
first. Prefer backfilling the template over adding an entry.

## Folder Structure

```
/app
  page.tsx                       # homepage — composes blocks
  /login/                        # admin sign-in (page + form + server action)
  /api/auth/[...nextauth]/       # Auth.js route handler — re-exports auth.ts's `handlers`
  /api/booking/                  # route handlers: thin, delegate to features/booking
  /api/leads/                    # route handlers: thin, delegate to features/leads
  /(admin)/dashboard/            # protected admin routes: layout (session + sign-out),
                                 # bookings/page.tsx, leads/page.tsx
/components
  /ui/                          # shadcn primitives, generic, no business logic
  /blocks/                      # config-driven composed sections (Hero, ServicesGrid,
                                 # TeamGrid, Testimonials, ContactCTA, Booking, ContactForm)
                                 # — read config/content/feature data as props
/features
  /booking/
    components/  hooks/  api/  schema/  index.ts
  /leads/
    components/  hooks/  api/  schema/  index.ts
  /<feature-name>/               # same shape for every future feature
/config
  schema/                        # Zod schemas + inferred types for every config/content shape
  site.config.ts                 # business identity, contact info, nav, SEO defaults — parsed via schema/site.schema.ts
  theme.config.ts                 # design tokens, applied as CSS vars — see Tailwind v4 note above
  features.config.ts              # feature flags, checked only via lib/features.ts
  content/
    services.ts  team.ts  testimonials.ts   # parsed via schema/content.schema.ts
/lib                              # cn, features.ts, theme.ts, prisma.ts, rate-limit.ts
  email.ts                        # transport only: sendEmailWith(config, msg) + sendEmail(msg)
  email-config.ts                 # stored settings -> transport; the one lib -> server import
  email-shell.ts                  # plainTextToHtml + the mail-client-safe envelope
  email-errors.ts                 # provider failure -> a string safe to show and store
  secret-box.ts                   # AES-256-GCM for credentials the owner stores
/server
  services/                      # bookingService.ts, leadService.ts — business logic + Prisma,
                                 # called only from route handlers or feature api/ files
/types
/hooks                           # generic cross-feature hooks only (useMediaQuery, etc.)
/prisma
  schema.prisma                  # no datasource url — see Prisma 7 note above; includes AdminUser
  seed.ts                        # per-client seed data, safe to diverge per repo
/generated/prisma                # generated client output — gitignored, regenerated on install
auth.ts                          # Auth.js v5 root config (Credentials provider, JWT sessions)
proxy.ts                         # Next.js 16 "middleware" — protects /dashboard/:path*
prisma.config.ts                 # CLI connection config (migrate/seed/studio)
compose.yaml                     # local dev Postgres container
.env.example                     # tracked; copy to .env.local per repo
```

`/config`, `/prisma/seed.ts` and env vars are per-client by definition. Presentation —
a client's own blocks, its `globals.css`, its class names — diverges too, and is expected
to. Behaviour (schemas, services, auth, feature logic) should stay identical; see
"Template vs Client Repo" above for how to tell the two apart when resolving a merge.

## Conventions

- Hooks: `use<Feature><Verb>` (`useBookingSubmit`, `useLeadStatus`).
- Services (`/server/services`): `<entity>Service.ts`, one exported object per entity,
  called only from route handlers or feature `api/` files — never from components.
- Every mutation has an explicit loading, error, and success UI state — no bare
  try/catch swallowing errors silently.
- New DB tables only for data generated at runtime (bookings, leads, uploads, auth),
  **or for content the business owner changes themselves without a redeploy**. The
  test is who owns the decision, not who typed it first: `PaymentSettings` (when to
  collect) and `TeamMember` (who works here) are the owner's operational facts, so
  they are rows; services, curated testimonials and business info are agency design
  decisions, so they stay in `/config`/`content`. Config still seeds the
  owner-editable ones — `config/content/team.ts` is read once, the first time a repo
  has no roster, so a freshly cloned client repo renders correctly with no extra
  onboarding step. Do not widen this further without the same justification; it is
  one exception with a stated rule, not an invitation.
- Admin-only mutations (dashboard actions like cancel/mark-handled) are inline Server
  Actions (`"use server"` closures in the page, or exported `*Action` functions in a
  feature's `api/` folder) rather than hook+fetch+route-handler — there's no client-side
  loading/error UI to build for a single-admin internal tool, but every such action must
  still re-check `await auth()` itself (see Auth.js v5 note above).
- A service's `priceFrom: 0` (in `config/content/services.ts`) renders as "Free" in
  `ServicesGrid`, not "From $0" — use `0`, not `undefined`, for a genuinely free service
  (a consultation, say); `undefined`/omitted means "don't show a price line at all."
- Tests that exercise pure logic over real `config/content/*` imports (e.g.
  `calculate-estimate.test.ts`) must `vi.mock` those content modules with a small
  fixture, not assert against whatever a specific client repo's real content contains —
  test files are shared, non-diverging code (see Folder Structure), so a test coupled to
  one client's specific slugs/prices breaks in every other client repo.

## Commands

- `docker compose up -d` — start the local dev Postgres container (do this first)
- `npm run dev` / `npm run build` / `npm run lint` / `npm run typecheck`
- `npm run format` / `npm run format:check`
- `npm run db:migrate` / `npm run db:seed` / `npm run db:studio`
- `npm test` / `npm run test:watch` / `npm run test:db:setup` — see Testing below

## Feature-Addition Checklist

1. Create `/features/<name>/{components,hooks,api,schema,index.ts}`.
2. Define the Zod schema first; derive types from it.
3. Add the flag to `features.config.ts`; gate rendering and routes via
   `lib/features.ts::isFeatureEnabled`.
4. Wire into a `/components/blocks` entry only if it needs to appear in marketing pages.
5. Add loading/error/empty states.
6. If it introduces a new DB table, confirm it's runtime-generated data, not
   agency-authored content (see Conventions above) before adding it to `schema.prisma`.
   Run `npm run db:migrate` after any schema change.
7. If the feature's Server Component reads live DB state, mark that page/route
   `export const dynamic = "force-dynamic"` (see Prisma 7 note above) — don't let it
   silently prerender as static.
8. Update this file if the feature introduces a new convention future features should
   follow.

## New-Client Onboarding Checklist

1. Clone `github.com/shoaibmalick/website-starter-kit`, then point the clone's `origin`
   at the new client repo and add this one back as `upstream`:
   `git remote add upstream https://github.com/shoaibmalick/website-starter-kit.git`
   `git remote set-url --push upstream DISABLED_use_the_template_repo_directly`
   (the second line stops a client's content being pushed into the template by accident).
   Set `config/site.config.ts`'s `business.timezone` — it defaults to UTC, which silently
   shows every visitor the wrong appointment times. Set `business.currency` in the same
   breath: it defaults to `CAD` because both existing clients are Ontario, so a business
   anywhere else charges the wrong denomination until it is set.
2. Give the new repo a read-only deploy key on the template, or its first CI run fails.
   The `drift` job in `ci.yml` reads `upstream/master`, and `GITHUB_TOKEN` cannot: it is
   scoped to the repository running the workflow. Generate a keypair, register the public
   half on the template, and store the private half as the client's secret:

   ```bash
   ssh-keygen -t ed25519 -N "" -C "drift-check: <client> (read-only)" -f /tmp/<client>
   gh repo deploy-key add /tmp/<client>.pub --repo shoaibmalick/website-starter-kit \
     --title "drift-check: <client> (read-only)"
   gh secret set TEMPLATE_DEPLOY_KEY --repo shoaibmalick/<client> < /tmp/<client>
   rm /tmp/<client> /tmp/<client>.pub
   ```

   One key per client, so any single client's access can be revoked without touching the
   others. The job fails rather than skips when the secret is absent — deliberately, since
   a drift check that quietly passes when it could not run is worse than none.

3. **Ask the client for hero photographs, at intake, before anything else visual.**
   `business.heroImages` is a list of paths under `/public`; `HeroCinematic` crossfades
   between them. Landscape, 2400×1600 or larger, and put the strongest first — it is the
   LCP element and the only one loaded eagerly.

   Two rules learned on real client photography, both worth repeating to the client:

   - **Reject any photograph carrying another business's branding** — a salon name on a
     reception wall, a legible product shelf, someone else's framed certificates. On this
     client's own site it reads as a claim about them. A hair-salon build had to drop its
     best interior shot for exactly this.
   - **Ask what the licence is, and record it.** `config/content/image-credits.ts` takes
     the answer. If nobody knows yet, say so in the entry rather than writing a
     plausible-looking photographer and licence URL — the attribution page is the last
     place a reader expects to be misled.

   An empty list is a supported state: the hero renders text-only on the normal page
   background, so a repo mid-onboarding looks unfinished rather than broken.

4. Fill `config/site.config.ts`, `theme.config.ts`, `features.config.ts`, `content/*`.
   Use the `REPLACE_WITH_*` sentinels from `lib/placeholder-guard.ts` for any business fact
   you do not have yet — phone, address, hours — rather than inventing a plausible one or
   typing `(000)-000-0000`. Both of those read as placeholders to a person and as ordinary
   content to a machine, which is how a sibling repo kept a fake address in its
   `LocalBusiness` JSON-LD for weeks. Then call `assertNoPlaceholders` at the bottom of that
   client's `site.config.ts` — the guard ships with the kit but each repo arms it, because
   which facts are required is a per-client decision. A build pointed at a real hostname then
   refuses to compile until they are filled in.
5. Set that client's design tokens in `config/theme.config.ts`.
6. Provision: Vercel project, a Postgres host (Supabase or Neon), Stripe account (the
   client's own), UploadThing app. Populate env vars, including a freshly generated
   `AUTH_SECRET` (never reuse one across clients) and a real admin email/password (set
   directly in the database for that client — don't rely on the dev-only seed defaults).

   **A `NEXT_PUBLIC_*` variable cannot be Sensitive**, and this is worth reading before the
   first deploy rather than after it. Vercel refuses secret visibility on any name carrying
   a framework public prefix — those are inlined into the client bundle, so a "secret" one
   would be a lie — while `vercel env add` defaults to sensitive and fails with
   `invalid_visibility`. Pass `--no-sensitive`. The trap is bulk-importing a `.env`, which
   marks every row sensitive at once: the variables then plainly _exist_ in the dashboard
   while the build insists they are missing, and `lib/env.ts` throws `DATABASE_URL is
required` about a value you are looking at. Two production builds were lost to this on
   Golden Fork before anyone thought to read the visibility column, because the error names
   the variable and says nothing about why it could not be read.

   Set `NEXT_PUBLIC_SITE_URL` to the alias Vercel **actually assigns**, never the one you
   expect. A taken project name silently gets a random suffix: `golden-fork.vercel.app`
   already belonged to an unrelated restaurant, so the alias came back as
   `golden-fork-dun.vercel.app`. That value drives canonical URLs, the sitemap and the
   `Restaurant`/`LocalBusiness` JSON-LD, so guessing it publishes wrong canonicals to search
   engines. Deploy once, read the alias off the output, set the variable, redeploy.

   **Mail: only reach for Resend if the client owns a domain.** Resend will not deliver to
   arbitrary recipients until a sending domain is verified, so for a client living on a
   `.vercel.app` address it is not the slower option, it is an impossible one — which is why
   this step no longer lists a Resend domain as something to provision. The `SMTP` provider
   at `/dashboard/settings` is the answer: the business's own Gmail plus a Google App
   Password (which requires 2-Step Verification to be switched on first) sends real mail
   today, over `smtp.gmail.com:465` secure, with no domain and no redeploy. Two behaviours
   will otherwise be reported as bugs. Gmail **rewrites the From header** to the
   authenticated account, so a From on a domain the client does not own is replaced
   silently and the fix is to set From to the Gmail address itself with the business name as
   the display name. And the cap is roughly 500 messages a day — far above a small
   restaurant, well below a mailing list. Moving to Resend once a domain exists is a
   dropdown on that same form, not a code change.

7. `npx prisma migrate deploy && npx prisma db seed`.
8. Deploy, verify Lighthouse a11y ≥ 95 and mobile responsiveness on the live site.
9. Confirm `/dashboard` is unreachable without logging in, and that the real admin
   credentials (not the dev seed defaults) work.

## Never Do

- Never hardcode a client's business content inside `/components` or `/features` — it
  belongs in `/config` or `/content`.
- Never bypass Zod validation "just this once" at a boundary.
- Never add a cross-feature deep import (import another feature's internals directly).
- Never add a DB table for content the agency authors — that's a config/content file.
  The exception, and its reasoning, is in Conventions above: content the _business
  owner_ edits without a redeploy may be a table. "The client asked for it" is not
  the test; "the client, not the agency, owns this decision" is.
- Never fix _behaviour_ only in a client repo — a bug, a guard, a validation rule, a
  service method belongs in the template first, then merged down, or the next client
  inherits the bug. Restyling a block to a client's own design system is not this, and
  is fine to do in the client (see "Template vs Client Repo").
- Never commit `/generated` (the Prisma client output) — it's regenerated via
  `prisma generate` (wired into `postinstall`).
- Never let a Server Component read live DB state without `dynamic = "force-dynamic"`
  (or an equivalent opt-out) — see the Prisma 7 note above.
- Never ship a real client with the dev-only `SEED_ADMIN_PASSWORD` default, and never
  reuse an `AUTH_SECRET` across clients. `.env.example` now ships both seed variables
  **blank** — they were the only pre-filled values in the file, so anyone who copied it
  and filled in the empty ones deployed a live admin account on `changeme123`. Leave them
  blank and the seed skips the admin user entirely.
- Never add a recipient field to an admin send. The address is re-derived from the record
  server-side; making it an input turns a dashboard login into an open relay on the
  business's own sending domain. See "Admin email note" above.
- Never treat `sendEmail` resolving as proof it sent — check `delivered`. It resolves and
  sends nothing when no transport is configured.
- Never interpolate a user-supplied value into email HTML without `escapeHtml`, and never
  add a public POST route that doesn't go through `guardPublicPost`. See "Security
  Conventions" above.
- Never add a Server Action that mutates data without an `await auth()` check inside
  it — `proxy.ts` covers page navigation and same-path Server Action calls, but the
  action itself is the last line of defense if that ever changes.
- Never point `.env.test`'s `DATABASE_URL` at the dev database — integration tests
  call `deleteMany()` between runs and will destroy real dev data. `prisma/seed.ts` is
  the same hazard from the other direction: it opens by deleting every booking and slot
  and resets the admin password, so it now refuses unless `DATABASE_URL` points at a
  recognised local host (`lib/seed-guard.ts::assessSeed`). The question it asks is which
  database you are pointed at, not which `NODE_ENV` you claim to be in — `NODE_ENV` is
  routinely unset for exactly the one-off script that does the damage.
  `ALLOW_DESTRUCTIVE_SEED=1` overrides it, and at a terminal you must additionally type
  the host name, so an exported shell variable is not enough on its own.
