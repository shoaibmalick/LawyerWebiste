# Specification — Harbourline Law Group LLP Demo Website

**Status:** Draft for review · **Version:** 0.1 · **Date:** 2026-09-17
**Method:** Spec-driven development. This document is the contract. Code follows it; when
reality forces a change, this file is edited first.

---

## 1. Overview

### 1.1 Purpose

A demo marketing website for a full-service law firm serving **two distinct audiences** —
businesses (B2B) and individuals (B2C) — built to show a prospective client what a
practice-area-driven legal site looks like end to end: public marketing pages, lead
capture, consultation booking, and an admin area where the firm edits its own content.

### 1.2 The demo firm

| Field        | Value                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Name         | **Harbourline Law Group LLP**                                                        |
| Tagline      | _Counsel that crosses the border with you._                                          |
| Positioning  | Cross-border business and personal law across **Canada and the United States**       |
| Offices      | Toronto, Ontario · New York, New York                                                |
| Theme        | `HARBOUR` preset (clinical blue, light) — already ships in `config/theme.presets.ts` |
| `schemaType` | `Attorney` (already an allowed value in `config/schema/site.schema.ts`)              |
| Currency     | `CAD` (the `site.schema.ts` default; USD is available)                               |

The cross-border angle is not decoration. It is what makes a generic practice-area list
into a differentiated one, and it gives every service page a concrete reason to exist:
the same problem answered twice, once for each side of the border.

### 1.3 This is a demo — required safeguards

The firm is fictional. The starter kit's `lib/placeholder-guard.ts` exists precisely to
stop invented business facts reaching search engines, and it must be honoured:

- `app/robots.ts` returns **`disallow: "/"`** for this project. A fictional law firm must
  not be indexed.
- The invented phone, address and email are passed to `buildLocalBusinessSchema` through
  its `provisional` argument, so a genuine public production deploy **throws** rather than
  publishing a fake firm's `Attorney` JSON-LD.
- A persistent footer disclaimer on every page: _"Harbourline Law Group LLP is a
  fictional firm. This site is a design demonstration. Nothing here is legal advice and no
  solicitor-client or attorney-client relationship is created by using it."_
- A short version of the same disclaimer sits at the foot of every practice-area and
  service page, plus a dedicated `/legal/disclaimer` page.
- No claim of outcomes anywhere in the copy. Law Society of Ontario and US state bar
  advertising rules restrict "best", "guaranteed", win rates and recovery figures; the
  content files are written without them.

### 1.4 Non-goals

Out of scope for this build: real payments (Stripe stays disabled), a client portal or
customer accounts, a blog/insights CMS, French-language content for Quebec, real attorney
biographies or photographs, and e-filing or document-assembly workflows.

---

## 2. Base project

Built by cloning `C:\Users\shoai\Documents\Claude Projects\Sample Project for Clients`
(the "website starter kit") into `C:\Users\shoai\Documents\Claude Projects\LawyerDemo`.

### 2.1 Stack inherited as-is

Next.js 16 (App Router, Turbopack) · React 19.2 · TypeScript 5 strict · Tailwind v4
(CSS-first, **no `tailwind.config.ts`**) · shadcn `base-nova` on `@base-ui/react` (not
Radix) · Prisma 7 + PostgreSQL · Auth.js v5 (JWT sessions, Credentials) · react-hook-form

- Zod 4 · Resend/nodemailer · Anthropic SDK (FAQ chatbot) · Vitest 4.

### 2.2 What we reuse without rewriting

| Capability                                               | Where                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Compile-time CMS pattern (Zod-parsed TS content modules) | `config/content/*`, `config/schema/*`                                           |
| Lead pipeline, hardened                                  | `features/leads/` → `app/api/leads/route.ts` → `server/services/leadService.ts` |
| Public POST guard (rate limit, content-type, body cap)   | `lib/api-guards.ts::guardPublicPost`                                            |
| Spam trap                                                | `components/ui/honeypot-input.tsx`, `lib/honeypot.ts`                           |
| Admin auth + defence in depth                            | `auth.ts`, `proxy.ts`, `lib/auth-guards.ts::requireAdmin`                       |
| Admin dashboard shell                                    | `app/(admin)/dashboard/`                                                        |
| Consultation booking + availability                      | `features/booking/`, `app/api/booking/`                                         |
| Attorney roster (DB-backed, config-seeded)               | `TeamMember` model + `features/team/`                                           |
| Theming                                                  | `config/theme.config.ts` → `lib/theme.ts::themeConfigToCssVars`                 |
| JSON-LD builder + placeholder guard                      | `lib/structured-data.ts`, `lib/placeholder-guard.ts`                            |
| AI FAQ chatbot                                           | `features/ai-chatbot/`, `app/api/chatbot/route.ts`                              |
| Reviews with moderation                                  | `features/reviews/`                                                             |
| Email transport + HTML escaping                          | `lib/email*.ts`, `lib/html.ts::escapeHtml`                                      |

### 2.3 Repo setup steps

1. Copy the starter kit into `LawyerDemo`, **excluding** `node_modules/`, `.next/`,
   `.git/`, `generated/`, `tsconfig.tsbuildinfo`, `.env.local`, `.env.test`.
2. `git init`; rename `package.json` `name` to `lawyer-demo`.
3. **Delete the `drift` job from `.github/workflows/ci.yml`.** It reads `upstream/master`
   over `TEMPLATE_DEPLOY_KEY` and hard-fails in a standalone repo. Keep the `verify` job
   (lint → typecheck → build → `test:db:setup` → test).
4. Remove `npm run check:drift` from `package.json`.
5. **`.env.local` already exists in this repo** with the Neon credentials — do **not**
   `cp .env.example .env.local`, that would clobber it. Merge any missing keys from
   `.env.example` into the existing file. Then `cp .env.test.example .env.test`;
   `docker compose up -d` (test database only, see §2.4); `npm install`;
   `npm run db:migrate`; `npm run db:seed`.
6. Rewrite `CLAUDE.md`'s **Project Overview** and **New-Client Onboarding Checklist**
   for this project. Everything else in `CLAUDE.md` — Architecture Rules, Security
   Conventions, Conventions, Feature-Addition Checklist, Never Do — **stays in force and
   this build obeys it.**

### 2.4 Database — Neon

The application database is **Neon Postgres** (`neondb`), not the kit's default local
Docker container. Three consequences, all of which must be handled at Phase 0:

**1. One URL, with the direct endpoint derived.** `.env.local` carries only
`DATABASE_URL`, on Neon's **pooled** endpoint. `lib/prisma.ts` uses it as-is, which is
correct for the app runtime. `prisma.config.ts` strips the `-pooler` infix to reach the
direct endpoint, which is what the CLI needs:

```ts
datasource: {
  url: process.env.DATABASE_URL?.replace("-pooler.", "."),
},
```

Neon's pooled endpoint is PgBouncer in transaction mode and cannot serve `prisma migrate`,
which needs session-scoped advisory locks and prepared statements. A URL with no `-pooler`
(the local Docker test database) passes through unchanged.

> **Derived, not a second variable — this was found the hard way.** The first attempt used
> a separate `DIRECT_DATABASE_URL` with `process.env.DIRECT_DATABASE_URL ?? DATABASE_URL`.
> `npm run test:db:setup` runs through `dotenv -e .env.test`, which sets `DATABASE_URL` to
> the local test database but knows nothing about `DIRECT_DATABASE_URL` — so
> `prisma.config.ts` filled it from `.env.local` and aimed the Prisma CLI at the
> **production Neon database**. `migrate deploy` only reads, so nothing was lost, but
> `npm test` truncates tables. Two variables can disagree; one cannot disagree with itself.
> Do not reintroduce `DIRECT_DATABASE_URL`.

**Verified both paths:**

| Command                                                    | Resolves to                                    |
| ---------------------------------------------------------- | ---------------------------------------------- |
| `npm run test:db:setup`, `npm test`                        | `website_starter_kit_test` at `localhost:5433` |
| `npx prisma migrate deploy/status`, `db:seed`, `db:studio` | `neondb` at `ep-dry-brook-...` (no `-pooler`)  |

**2. `.env.test` must not point at Neon.** The kit's integration tests truncate tables
between runs, and `CLAUDE.md`'s Never Do list forbids pointing `.env.test` at the dev
database. Local Docker Postgres (`website_starter_kit_test`, created by
`docker/init-test-db.sql`) is retained for tests — `compose.yaml` and
`npm run test:db:setup` exist for that purpose only. **Decided 2026-09-17: keep Docker for
tests.** (The alternative, a dedicated Neon branch, would be a one-line `.env.test`
change if that ever becomes preferable.)

**Host ports are remapped.** Sibling projects on this machine (`sampleprojectforclients`,
`smilestudiodental`, `goldenfork`) declare `restart: unless-stopped` and bind 5432/1025,
so whichever Docker starts first owns those ports and `docker compose up` here failed with
`port is already allocated`. `compose.yaml` therefore publishes on **5433** (Postgres) and
**1026 / 8026** (mailpit inbound / web UI); container-internal ports are unchanged.
`.env.test` points at `localhost:5433`. Mailpit's web UI for this project is
`http://localhost:8026`. CI is unaffected — the GitHub Actions `postgres` service container
binds 5432 in its own network namespace, and `ci.yml` writes its own `.env.test`.

**3. `sslmode=require&channel_binding=require`** is preserved verbatim in both URLs.
`@prisma/adapter-pg` passes the string through to node-postgres, which handles both.

**Credential handling:** the Neon connection string was supplied in chat, so it now lives
in this session's transcript as well as in `.env.local`. `.gitignore` already excludes
`.env*`, so it will not be committed. Rotate the Neon password from the Neon console if
this project or transcript is ever shared.

### 2.5 Gaps we are building

1. The starter kit is a **single-page site**. No `(marketing)` route group, no nested
   routes, `app/sitemap.ts` has exactly one entry. All routing below is net-new.
2. `components/ui/` holds only four files (button, calendar, field, honeypot-input). The
   components in §7.2 must be added via `npx shadcn add`.
3. `config/content/services.ts` is **appointment-shaped** (`durationMinutes` required,
   every card links to `?service=<slug>#booking` on whichever route carries the booking
   form — `/consultation` here, see 7.17). Practice areas are pages, not slots,
   so they get their own content module (§4) and `services.ts` is repurposed narrowly
   (§4.4).

---

## 3. Information architecture

### 3.1 Public routes

```
/                                           Home — dual-audience split
/business                                   B2B hub — 6 category cards
/business/[category]                        Category overview + its 4 services
/business/[category]/[service]              Service detail
/individuals                                B2C hub — 6 category cards
/individuals/[category]
/individuals/[category]/[service]
/attorneys                                  Roster (DB-backed TeamMember)
/attorneys/[slug]                           Attorney detail
/about                                      Firm story, cross-border footprint
/contact                                    Lead form with practice-area selector
/consultation                               Booking (existing feature, reframed)
/legal/disclaimer                           Full demo + no-advice disclaimer
/legal/privacy                              Privacy notice
/legal/terms                                Terms of use
/credits                                    Existing image credits page (noindex)
```

Total public routes: **~62** (2 hubs + 12 categories + 48 services + ~10 standalone).

### 3.2 Audience segment naming

`/business` and `/individuals` are the URL segments; `audience` in the content model is
`"business" | "individual"`. The two are mapped by one exported constant so the pairing
cannot drift:

```ts
// config/content/practice-areas/index.ts
export const AUDIENCE_SEGMENT = { business: "business", individual: "individuals" } as const;
```

### 3.3 Admin routes (all behind `requireAdmin()`)

```
/dashboard                      Existing overview
/dashboard/leads                Existing — EXTENDED (§6.3)
/dashboard/bookings             Existing
/dashboard/availability         Existing
/dashboard/reviews              Existing
/dashboard/settings             Existing (theme, business info, attorney roster)
/dashboard/practice-areas       NEW — the CMS (§5)
```

`proxy.ts`'s matcher already covers `/dashboard/:path*`. Every new admin page still calls
`requireAdmin()` itself — defence in depth, per CVE-2025-29927 as documented in
`app/(admin)/dashboard/layout.tsx`.

---

## 4. Content model

### 4.1 Source of truth

The two markdown files in the repo root are the **authored copy**:

- `BusinessToBusinessContent.md` &rarr; 6 categories, 24 services
- `BusinessToCustomer.md` &rarr; 6 categories, 24 services

They are **parsed into the TS modules by a generator**, not transcribed by hand:
`npm run content:generate` (`scripts/generate-practice-areas.mjs`). Forty-eight services
retyped is forty-eight chances to drop a key feature or mistype a slug, and nothing
downstream would notice a summary that silently belonged to the service above. The parser
is strict &mdash; any structural surprise throws rather than emitting something plausible
&mdash; and it formats its own output, so `format:check` passes straight after a run. Re-running
it is a no-op, which is asserted before each release of a phase.

The generated files carry a `GENERATED FILE - DO NOT EDIT BY HAND` header. Edit the
markdown and regenerate; an edit made in the TS is lost on the next run and, worse, puts
the published page out of step with the copy everyone reviews.

`relatedSlugs` is the one field not authored in the markdown. The generator derives it as
the other three services in the same category &mdash; the pages a reader on this one most
likely wants next, and derived rather than written so it can never dangle.

### 4.2 New schema — `config/schema/practice-area.schema.ts`

```ts
import { z } from "zod";

export const JURISDICTIONS = ["US", "CA"] as const;
export const jurisdictionSchema = z.enum(JURISDICTIONS);

export const faqSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(1200),
});

export const legalServiceSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  /** Card copy. Must stand alone in a grid. */
  summary: z.string().min(1).max(200),
  /** 2-3 sentences opening the detail page. */
  description: z.string().min(1),
  keyFeatures: z.array(z.string().min(1)).length(4),
  jurisdictions: z.array(jurisdictionSchema).min(1),
  faqs: z.array(faqSchema).min(2).max(5),
  /** Slugs of related services, any category or audience. Validated in 4.3. */
  relatedSlugs: z.array(z.string()).default([]),
  cta: z.string().min(1).max(80),
  icon: z.string().min(1),
  seo: z.object({
    title: z.string().min(1).max(60),
    description: z.string().min(50).max(170),
  }),
});
export type LegalService = z.infer<typeof legalServiceSchema>;

export const practiceAreaSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  audience: z.enum(["business", "individual"]),
  name: z.string().min(1),
  tagline: z.string().min(1).max(90),
  overview: z.string().min(1),
  icon: z.string().min(1),
  order: z.number().int().positive(),
  seo: z.object({
    title: z.string().min(1).max(60),
    description: z.string().min(50).max(170),
  }),
  services: z.array(legalServiceSchema).length(4),
});
export type PracticeArea = z.infer<typeof practiceAreaSchema>;

export const practiceAreasSchema = z.array(practiceAreaSchema);
```

`seo.description` is capped at 170 rather than 160 so a ten-character overrun is a review
note, not a module-load crash on a content edit.

### 4.3 Content modules

```
config/content/practice-areas/
  business.ts      // practiceAreasSchema.parse([...])  6 categories
  individual.ts    // practiceAreasSchema.parse([...])  6 categories
  index.ts         // merge, cross-validate, export lookups
```

`index.ts` runs the invariants that a per-array `.parse()` cannot see, and **throws at
module load** if any fail — the same fail-fast discipline the rest of `config/` uses:

1. All 12 category slugs unique.
2. All 48 service slugs unique **across both audiences** (a service slug is globally
   addressable, so a collision would make one page unreachable).
3. Every `relatedSlugs` entry resolves to a real service slug.
4. `order` is contiguous `1..6` within each audience.

It exports the read helpers every route uses:

```ts
export function listPracticeAreas(audience: Audience): PracticeArea[];
export function findPracticeArea(audience: Audience, slug: string): PracticeArea | undefined;
export function findService(
  slug: string,
): { area: PracticeArea; service: LegalService } | undefined;
export function allServiceRoutes(): { audience: Audience; category: string; service: string }[];
```

`allServiceRoutes()` is what feeds both `generateStaticParams` and `app/sitemap.ts`, so
the sitemap cannot fall out of step with what actually renders.

### 4.4 Relationship to the existing `services.ts`

`config/content/services.ts` stays, but is repurposed to the **bookable consultation
types** only — the things `features/booking` actually sells a time slot for:

| slug                    | name                          | durationMinutes | priceFrom            |
| ----------------------- | ----------------------------- | --------------- | -------------------- |
| `initial-consultation`  | Initial consultation          | 30              | `0` (renders "Free") |
| `business-legal-audit`  | Business legal audit          | 60              | set                  |
| `estate-plan-review`    | Estate plan review            | 45              | set                  |
| `cross-border-strategy` | Cross-border strategy session | 60              | set                  |

It is **not** merged with `practice-areas`. `durationMinutes` is required there and
meaningless for a practice area, and `ServicesGrid` links every card into the booking
form (see 7.17).
Keeping them separate avoids widening a schema in the template for one client's shape —
which `CLAUDE.md`'s template-vs-client rule forbids.

---

## 5. Admin CMS

### 5.1 The rule this has to satisfy

`CLAUDE.md` states: _"New DB tables only for data generated at runtime … **or for content
the business owner changes themselves without a redeploy**."_ An admin CMS is that stated
carve-out, not a widening of it. The model is the existing `TeamMember` precedent: config
seeds and remains the fallback; the DB holds only what the owner changes.

**Content is never duplicated into the database.** Names, descriptions, key features, FAQs
and SEO text live only in the TS modules. The table holds presentation decisions plus two
short text overrides.

### 5.2 Schema addition

```prisma
enum PracticeAreaKind {
  CATEGORY
  SERVICE
}

model PracticeAreaOverride {
  id              String           @id @default(cuid())
  /** Category or service slug from config/content/practice-areas. */
  slug            String           @unique
  kind            PracticeAreaKind
  visible         Boolean          @default(true)
  featured        Boolean          @default(false)
  /** Null = use the config order. Rewritten wholesale on reorder, like TeamMember.sortOrder. */
  sortOrder       Int?
  summaryOverride String?
  ctaOverride     String?
  updatedAt       DateTime         @updatedAt

  @@index([kind, sortOrder])
}
```

A row exists only for a slug the owner has actually touched. An empty table renders the
site exactly as config describes it.

### 5.3 Feature slice

```
features/practice-areas/
  schema/practice-area-override.schema.ts   // Zod, defined before the types
  api/list-practice-areas.ts                // server read: config x overrides
  api/update-practice-area.ts               // "use server", *Action, requireAdmin()
  api/reorder-practice-areas.ts             // "use server", *Action, requireAdmin()
  components/practice-area-admin-table.tsx  // "use client"
  hooks/use-practice-area-reorder.ts
  index.ts                                  // the ONLY cross-feature import surface
```

Merge semantics in `listPracticeAreas`:

| Field                | Resolution                                                                          |
| -------------------- | ----------------------------------------------------------------------------------- |
| everything not below | config, always                                                                      |
| `summary`            | `summaryOverride ?? config.summary`                                                 |
| `cta`                | `ctaOverride ?? config.cta`                                                         |
| ordering             | `sortOrder ?? config.order`                                                         |
| visibility           | `visible === false` → excluded from public routes **and returns 404 on direct URL** |
| `featured`           | promotes the item onto the home page's featured strip                               |

Hiding must apply at the route level, not only in the grid — `CLAUDE.md`: _"a disabled
feature must be unreachable in UI and at the route/API level."_ Hidden slugs also drop out
of `sitemap.ts` and `generateStaticParams`.

### 5.4 Admin UI — `/dashboard/practice-areas`

`export const dynamic = "force-dynamic"` (reads live DB state). Two-level table grouped by
audience: each category row expands to its four services. Per row — a visibility toggle, a
featured toggle, up/down reorder, and an inline edit for `summaryOverride` / `ctaOverride`
with a "reset to config" control that deletes the row. Every action is a Server Action
named `*Action`, re-checks `requireAdmin()`, returns
`{ ok: true; message } | { ok: false; error }`, and the client calls `router.refresh()`.
Explicit loading, error, empty and success states throughout.

### 5.5 Feature flag

Add `practiceAreasCms: true` to `config/features.config.ts` and its schema; gate the admin
route and its actions through `lib/features.ts::isFeatureEnabled`. With the flag off the
public site still renders straight from config — the CMS is additive, never load-bearing.

---

### 5.6 What the header taught us

Hiding a category was implemented and looked complete: the route 404'd, the hub grid
dropped it, the sitemap dropped it. The **header mega-menu went on linking to it from every
page on the site**, because `app/layout.tsx` built its menus from config at module scope.
A dead link in the primary nav is a worse outcome than the state hiding was meant to
produce, and nothing in typecheck, lint or the suite could see it &mdash; it took hiding a
real category and grepping the rendered HTML.

The menus are now built per request from the same `listPracticeAreas` the hub uses, so
every surface that lists categories agrees by construction. The rule worth carrying
forward: **when a feature removes something, enumerate every surface that lists it.** For
this site that is the hub grid, the category page, the service page, the sitemap, the
header (desktop and mobile), and the homepage featured strip.

## 6. Lead capture

### 6.1 Schema extension

`features/leads/schema/lead.schema.ts` gains four optional fields. They stay **optional**
so an existing embed that posts the old shape still validates — the same reasoning
`content.schema.ts` gives for keeping `category` optional.

```ts
audience:          z.enum(["business", "individual"]).optional(),
practiceAreaSlug:  z.string().max(100).optional(),
serviceSlug:       z.string().max(100).optional(),
jurisdiction:      z.enum(["US", "CA", "BOTH"]).optional(),
```

The schema stays `.strict()`, keeps `...honeypotField`, and `optionalPhoneSchema` is
unchanged so `lib/phone.ts` remains the single public phone format.

**Server-side validation:** `submitLead` verifies that a supplied `serviceSlug` resolves
via `findService()` and discards it if not. A slug arriving from a query string is
untrusted input and must not be stored or emailed unchecked.

### 6.2 Prisma

`Lead` gains `audience String?`, `practiceAreaSlug String?`, `serviceSlug String?`,
`jurisdiction String?`. Stored as strings, not enums — the slug vocabulary lives in config
and a content rename must not require a migration. Add `@@index([serviceSlug])`.

### 6.3 Flow

Every service page's CTA links to `/contact?service=<slug>`. `/contact` resolves the slug
server-side, prefills and locks the practice-area selector, and shows the service name
above the form. The route handler keeps `guardPublicPost` (rate limit `leads`, max 5), the
honeypot, `stripHoneypot()`, `isLikelyBot()`, and `validationError()` rather than raw Zod
issues. The notification email interpolates every value through `escapeHtml` **at
interpolation**, including the new fields.

`/dashboard/leads` gains Practice Area and Jurisdiction columns and a `next/form`
`action=""` filter by audience — filtering in the query, never over fetched rows.

---

### 6.4 Two resolutions, not one

The context fields travel from a query string, through a hidden input, to the database.
Every one of those hops is attacker-controlled, so the slug is resolved **twice** and
trusted neither time:

1. `app/contact/page.tsx` resolves `?service=` for display. An unknown value renders as
   though no service was named &mdash; nothing derived from the raw parameter reaches the page.
2. `features/leads/api/submit-lead.ts` resolves it again on submit, and this is the one
   that matters:
   - an unknown slug is **dropped**, not stored, because it would otherwise land in the
     firm's inbox and dashboard under a label reading "practice area";
   - `audience` and `practiceAreaSlug` are **derived from the resolved service** rather
     than read from the request, so a post claiming a criminal-defence service belongs to
     the business side cannot route a lead to the wrong lawyer;
   - a category is only accepted if it belongs to the audience claimed alongside it.

The schema's job is narrower than it looks: its regex proves the value _could not be
anything but_ a slug. It cannot prove the slug names something, because Zod has no view of
the content module. Both halves are needed, and the tests cover each separately.

## 7. Design

### 7.1 Foundations

- **Theme: `Harbourline`**, authored in `config/theme.config.ts`. The original plan was to
  adopt the kit's `HARBOUR` preset, but that palette is a clinical blue designed for a
  dental practice. A law firm reads as institutional first, so the shipped palette is a
  three-band system — paper `#FAF9F7` (warm off-white, easier than pure white across a
  2,000-word practice-area page), linen `#EFEBE4` for alternating sections, ink `#0E2136`
  for full-bleed anchor bands — with slate navy `#1D4E7A` as `primary` and a muted brass
  `#B07D2A` as the single warm note. `HARBOUR` and `MIDNIGHT` remain selectable at
  `/dashboard/settings`.
- **Contrast is computed, not eyeballed**, and the measured ratios are recorded in
  `config/theme.config.ts`: body 13.89 on paper / 12.30 on linen / 14.35 on ink; eyebrow
  8.24 / 7.29; muted body 6.12 / 5.42; button label 8.24; destructive 7.19; focus ring 5.07.
- **`accent` is decoration and large display only on light grounds** (3.43 on paper, below
  the 4.5 text bar; 4.51 on ink, where it works as an eyebrow). This is not a defect to
  fix: no single accent clears 4.5 against both a near-white and a near-black field, since
  the first requires relative luminance <= 0.167 and the second >= 0.241. Use `primary`
  for coloured text on light. The kit's own `HARBOUR` preset resolves this the same way.
- **Type:** `plusJakartaSans`. **Radius:** `0.375rem`, tighter than the kit's `0.75rem` —
  softness reads consumer, not counsel.
- **Custom tokens:** the kit's `--ink` / `--ink-foreground` / `--ink-muted` drive the home
  page's audience split and every page's closing CTA band.
- Edit `config/theme.config.ts`, **never `globals.css`** — the CSS vars are injected as an
  inline style on `<html>` in `app/layout.tsx`.

### 7.2 shadcn components

**Added:** `card`, `input`, `label`, `textarea`, `separator`.

**Deliberately not added**, because a native element does the job with less client JS and
better default behaviour:

| Candidate                 | Used instead                        | Why                                                                                                                                                                        |
| ------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accordion`               | `<details>/<summary>`               | Keyboard-operable and Ctrl+F-findable for free, and the answers stay in the DOM when collapsed &mdash; a JS accordion would hide the most search-relevant copy on the page |
| `breadcrumb`              | `components/blocks/breadcrumbs.tsx` | Emits `BreadcrumbList` JSON-LD from the same array it renders, so the trail and the structured data cannot disagree                                                        |
| `badge`                   | `jurisdiction-badge.tsx`            | A semantic `<ul>` with a visually-hidden label; bare pills reading "CA" "US" mean nothing to a screen reader                                                               |
| `sheet`                   | The header's existing disclosure    | Already built, already handles Escape, and needs no dialog primitive                                                                                                       |
| `tabs`, `switch`, `alert` | &mdash;                             | Nothing on the public site needed them                                                                                                                                     |
| `table`                   | &mdash;                             | Deferred to Phase 6, where the admin CMS actually has a table                                                                                                              |

> **The CLI installed a dependency nobody asked for.** `npx shadcn add` wrote
> `import { cn } from "cn"` into all five components and added `cn@0.3.0` to
> `package.json`, ignoring the `"utils": "@/lib/utils"` alias in `components.json`. It
> typechecked, because that package exists and exports a working `cn` &mdash; leaving the
> codebase with two different class-merge implementations, the kit's `button.tsx` on one
> and every new component on the other. Imports repointed at `@/lib/utils` and the
> package removed. Check the imports after any future `shadcn add`.

### 7.3 Blocks

New in `components/blocks/` — each takes content as props and never imports content
directly, per the architecture rules:

| Block                                        | Used by                                                        |
| -------------------------------------------- | -------------------------------------------------------------- |
| `audience-split.tsx`                         | Home — the two-door B2B/B2C choice                             |
| `practice-area-grid.tsx`                     | `/business`, `/individuals`                                    |
| `service-card-grid.tsx`                      | Category pages                                                 |
| `service-detail.tsx`                         | Service pages — description, key features, jurisdiction badges |
| `faq-accordion.tsx`                          | Service pages; also the source for `FAQPage` JSON-LD           |
| `jurisdiction-badge.tsx`                     | Anywhere a service is shown                                    |
| `attorney-grid.tsx` / `attorney-profile.tsx` | `/attorneys`, `/attorneys/[slug]`                              |
| `demo-disclaimer.tsx`                        | Footer and every practice-area page                            |

Extended: `site-header.tsx` — `siteConfig.nav` moves from anchors to real routes, with a
two-column mega-menu (`sheet` on mobile) listing both audiences' categories. Its existing
`resolveHref` anchor rewriting stays for the home page's in-page sections.

### 7.4 Page anatomy — service detail

Breadcrumb → H1 (service name) + jurisdiction badges → summary deck → description → key
features (4, as an icon list) → FAQ accordion (3) → related services (3 cards) →
CTA band linking `/contact?service=<slug>` → demo disclaimer.

Research on practice-area pages is consistent that depth wins: a page that names the
problem, the firm's approach, the jurisdiction specifics and a clear next action
outperforms a paragraph plus a form. This anatomy is that shape, sized for a demo.

---

## 8. SEO and structured data

| Surface          | Output                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Every route      | `generateMetadata` from the content module's `seo.title` / `seo.description`; canonical URL                      |
| Home             | `Attorney` JSON-LD via `buildLocalBusinessSchema`, with the fictional facts passed as `provisional`              |
| Category page    | `CollectionPage` + `BreadcrumbList`                                                                              |
| Service page     | `LegalService` (`serviceType`, `areaServed: ["US","CA"]`, `provider`) + `FAQPage` from `faqs` + `BreadcrumbList` |
| Attorney page    | `Person` with `worksFor`                                                                                         |
| `app/sitemap.ts` | Rebuilt to enumerate `allServiceRoutes()` plus standalone pages; hidden slugs excluded                           |
| `app/robots.ts`  | **`disallow: "/"`** — see §1.3                                                                                   |

Every static route uses `generateStaticParams`, since practice-area content comes from
config and needs no request. Only pages reading live DB state (`/attorneys`,
`/consultation`, all of `/dashboard`) carry `export const dynamic = "force-dynamic"`.

---

### 8.1 Rendering mode &mdash; resolved, measured

Phase 3 flagged that every route renders on demand and left it to be measured rather than
fixed blind. Measured, on a production build against Neon in another region:

| Route          | Median    | What it includes                  |
| -------------- | --------- | --------------------------------- |
| `/robots.txt`  | **3ms**   | no layout, no database            |
| `/sitemap.xml` | **75ms**  | database reads, no React layout   |
| `/about`       | **231ms** | React layout + its database reads |
| `/`            | **230ms** | layout + page reads + blocks      |

A single Neon query is 23ms; the TLS handshake is 173ms. So the ~230ms floor is the root
layout's reads plus rendering the shell, and it applies even to `/about` and
`/legal/disclaimer`, which have no data of their own.

**Resolution: not fixed, and deliberately.** The premise changed in Phase 6. Static
generation would mean the practice-area CMS stops working &mdash; hiding a category could
not take effect until the next deploy, which is the entire point of having built it. The
two are mutually exclusive, and the CMS is the feature that was asked for.

What _was_ done: `resolveAll` and `getBusiness` are now memoised per request with React's
`cache`. The layout called `listPracticeAreas` twice (one per audience menu) and
`getBusiness` was read again by several pages, each its own round trip. That bought 3&ndash;5%
&mdash; small, because those reads were already parallel &mdash; but it removes duplicate
queries that would have grown with the page count. `cache` dedupes within one request and
nothing beyond it, so no invalidation path is needed; that is the trap `getActiveTheme`
documents declining.

In production on Vercel with Neon in the same region, the database portion of that 230ms
largely disappears. For a demo on a laptop talking across a continent it is acceptable,
and it is now a known number rather than an unexamined one.

### 7.5 Design pass &mdash; motion, type and photography

Added after the nine build phases, taking its cues from the sibling Driving Institute site.
The motion primitives (`components/motion/*`) and `globals.css` turned out to be
**byte-identical** between the two repos, and both already use Plus Jakarta Sans &mdash; the
gap was never the primitives, it was that none of the blocks written for this site used
them.

**Added**

- `components/blocks/section.tsx` &mdash; `tone` (plain/muted/ink) x `width`
  (`max-w-6xl` / `max-w-3xl`) with `px-6 py-16 sm:py-24`. `SectionHeading` wraps `Reveal`
  itself, so a heading added later cannot be the one that forgets to animate.
- `components/ui/card-surface.ts` &mdash; one card treatment. `motion-safe:` gates the
  hover lift but **not** the border colour: a border shifting hue is not motion, and
  dropping it would cost the affordance for no accessibility gain.
- `Reveal` on ~57 call sites, staggered `delay={index * 0.08}` **per child, never on the
  container** &mdash; a container stagger makes the row wait on its slowest item.
- Three licensed hero photographs, crossfading, with a sticky jump nav on service pages
  and a stats band on `/about`.

**Two bugs this pass introduced, both found by measuring rather than looking**

1. **The hero scrim was illegible.** The first version assumed the copy sat at the bottom
   of the frame, where the bottom-up gradient is dense. It does not &mdash; the section's
   padding makes it taller than `70svh`, so `items-end` has nothing to push against and
   the headline lands over the brightest part of a blue-hour sky. Worst measured pair:
   **1.69:1**. Now three layers with a `bg-ink/50` floor, verified at **4.79:1 worst case**
   across all three images at both viewports.

   The measurement method matters as much as the number. Sampling a screenshot with the
   text _visible_ measures antialiased glyph edges, not the backdrop &mdash; it returns the
   same answer for every photograph, which is the tell. The correct method: record the text
   bounding boxes, hide the text, screenshot again, sample the lightest pixel in each box.

2. **`Reveal` hid content permanently when the reader jumped past it.** `whileInView` fires
   on intersection; an element skipped over never intersects, and `once: true` means it
   never recovers. The new jump nav made this trivially reachable &mdash; clicking "Related
   services" left the FAQ block blank forever. Measured: 4 of 13 reveals stuck invisible.
   Fixed with `margin: "200% 0px 0px 0px"`, which treats anything at or above the viewport
   as seen. This is a correctness fix, not a tuning knob.

**Verified:** axe-core 0 violations (11 pages x 2 viewports, WCAG 2.0/2.1/2.2 A+AA);
57 reveals with none stuck hidden under `prefers-reduced-motion`, slideshow frozen on one
frame; **LCP 184ms** on the homepage with the hero image as the LCP element; 76 sitemap
URLs all 200; no horizontal overflow at 1280 or 390.

**Image licensing** is recorded in `config/content/image-credits.ts` and rendered at
`/credits`. That page derives its list from images the site actually shows, and its list
had to be extended to include `business.heroImages` &mdash; without that it rendered a
heading over an empty list while the footer linked to it.

### 7.6 Contact details live in the footer

The homepage's "Visit us" band (`ContactCTA`) is gone. A whole full-bleed section spent on a
street address is a lot of page for something nobody scrolls a homepage to find, and it
competed with the one action that page is asking for. The address, both offices, the phone
number and the email now sit in the footer, marked up as an `<address>` so they are
announced as contact information rather than three unrelated lines.

The footer became a four-column grid at the same time: flex with `justify-between` sized
each group to its content and pushed the slack into one gap, leaving a hole beside the firm
name and a column too narrow for the street address to fit on one line.

`ContactCTA` itself is left in `components/blocks/` unused, consistent with the other
alternate kit blocks (`hero`, `gallery`, `testimonials`, `team-grid`, `reviews`).

**Two things this surfaced:**

- **A latent dead link.** The header CTA fell back to `href="#contact"` when booking is
  disabled &mdash; a kit default from when the site was one page. That anchor stopped
  existing when the band moved. Booking is on, so it was unreachable, but an anchor to a
  missing id scrolls nowhere and reports nothing. Both CTA hrefs now point at real routes
  and `config/nav.test.ts` covers them, since the CTA is resolved in the layout and was
  never part of `siteConfig.nav`.
- **The accessibility audit was measuring the animation.** Scanning straight after
  `networkidle` catches staggered reveals mid-fade &mdash; one stat label was at 0.05
  opacity &mdash; and reports that transient value as a contrast failure. The audit now
  settles the reveals before scanning. Separately, the eyebrow treatment copied from the
  sibling site used `text-primary/80`, which measures 4.59:1 against the linen band: over
  the line but with nothing to spare on 12px uppercase type. Full `primary` is 7.29:1.

### 7.7 Contact page, and the form on the homepage

`/contact` was a `max-w-3xl` column with a 14rem rail bolted to its side, and a stacked
`max-w-md` form inside that &mdash; less room than the page had, with the rail reading as an
afterthought. It is now two real columns at `max-w-6xl`: the form left, a sticky panel of
contact cards and offices right, and a full-width "What happens next" band below both.

`LeadForm` gained a `layout="wide"` option that pairs the short fields two-up. Not
cosmetic: a single column of eight full-width inputs reads as a long form whatever its
actual length, and length is what stops people finishing one. The textarea and submit stay
full width in both layouts.

**The form is back on the homepage, last.** It was removed in the design pass on the
argument that it competes with the hero's "book a consultation" &mdash; which holds only if
it sits near the top. At the foot of the page it catches a different reader: someone who
has read the whole thing and wants to describe a problem rather than pick a time slot. The
order is what keeps the two asks from fighting.

**Two bugs found while building it, both invisible to every automated check we run.**

1. **White text on a white card.** The homepage form sits on a light card inside the `ink`
   band. It set `bg-background` but not a text colour, so it inherited
   `text-ink-foreground` from the Section &mdash; **1.06:1**. Anything typed into that form
   would have been invisible. axe did not catch it and _could not_: the inputs are empty,
   and there is no text to measure until somebody types. Any block putting a light surface
   inside a dark band must restate the text colour as well as the background.

2. **The contact form could not be submitted on its default path.** An unselected
   `<select>` submits `""`, not `undefined`, and `.optional()` only permits _absent_ &mdash;
   a present empty string still had to satisfy the kebab-case regex, and did not. These
   fields have no error message of their own, so react-hook-form blocked the submit,
   rendered nothing, and the button appeared dead. **This dates from Phase 5** and survived
   because the browser test there used the prefilled-service path, where the hidden inputs
   are populated. The default path &mdash; leave both dropdowns alone and write a message
   &mdash; was the broken one.

   Fixed in the schema rather than the component, since the API accepts this shape from
   anywhere. That required splitting `CreateLeadInput` (output) from `CreateLeadFormValues`
   (input), because the schema now transforms and `z.infer` would tell the form an
   unselected dropdown is impossible &mdash; the exact assumption that caused the bug. Two
   route tests cover it, including that the allowance did not become a hole.

**Verified:** submission returns 201 from the homepage and `/contact`, with dropdowns left
at default and with them chosen; typed text measures 13.89:1 in both forms; axe 0
violations; 880 tests.

### 7.8 The firm's logo

The client supplied a logo: a gold `H` monogram over `HARBOURLINE / LAW GROUP` in charcoal
serif. It arrived the way logos usually arrive &mdash; as a **presentation render**, the
lockup photographed on a grey wall, complete with a vignette and a soft drop shadow. The
site's paper is `#FAF9F7`, so dropping the JPEG in as-is would have put a grey rectangle in
the header of every page.

**`scripts/extract-logo.mjs` (`npm run logo:generate`) cuts it out**, reading
`design/harbourline-logo-source.jpeg` &mdash; kept outside `/public`, so the render is never
served &mdash; and writing every derived file. A script rather than an afternoon in an image
editor, because revised artwork is then one command instead of a repeat of the same
afternoon. Two decisions in it are worth keeping:

- **The wall is modelled, not filtered away.** The first attempt estimated the background
  morphologically: a max filter wider than the thickest stroke does erase the ink, but at
  that width it also smears the vignette, and the error came back as a grey cloud around
  the monogram. The wall is a smooth gradient, so six coefficients per channel describe it
  to a mean error of **3.1/255** over the ~999k pixels the mask calls wall.
- **Alpha asks what the ink _is_, not how far it is from the background.** "Different from
  the background" is the obvious matte and it is wrong here, because the drop shadow is
  also different from the background &mdash; by about twenty levels &mdash; so it comes
  through at roughly half opacity and the cut-out carries a smudge of the wall it was meant
  to leave behind. There are exactly two inks and they are separable by what they are:
  gold is saturated (chroma 43&ndash;101), charcoal is dark (luma 38&ndash;51), and the wall
  and its shadow are neither. Alpha is the larger of those two answers. Edge pixels are then
  un-premultiplied against the fitted wall, which is what stops a pale outline appearing the
  moment the logo moves onto ink.

**Where it appears, and why not everywhere:**

| Asset                                           | Used by                | Note                                   |
| ----------------------------------------------- | ---------------------- | -------------------------------------- |
| `harbourline-mark.png`                          | header, app icons      | monogram only                          |
| `harbourline-lockup.png`                        | footer                 | mark + wordmark                        |
| `harbourline-lockup-reversed.png`               | share card             | wordmark repainted for dark grounds    |
| `harbourline-og.png`                            | `seo.ogImage`          | 1200&times;630, reversed lockup on ink |
| `app/icon.png`, `apple-icon.png`, `favicon.ico` | browsers, home screens | navy tile                              |

**The header takes the mark and sets the name in live type beside it.** The full lockup is
579&times;363; a header row that can spare about 32px of height would render its wordmark at
roughly four pixels of cap height, which is a smudge that happens to be the firm's name.
Type stays crisp at every zoom level, reflows, and is selectable. The mark carries `alt=""`
for the same reason &mdash; the name is already there, and hearing it twice is noise.

**The footer takes the lockup**, with the legal name as its alt text: it is the one column
on the page with the width the lockup was drawn for, and the one part of the page whose job
is to say whose site this is.

**Icons sit on a navy tile rather than being transparent.** An icon is composited onto
whatever the browser, home screen or bookmark bar is painted with, and gold on an unknown
ground is a coin toss. The margin tightens below 48px: at 32px in a tab strip there is no
rounded-corner mask and every pixel of margin is one the `H` does not get. `favicon.ico` is
a hand-built container of 16/32/48 PNG frames &mdash; Next emits `<link rel="icon">` from
`app/icon.png` and every current browser honours it, but a bare request for `/favicon.ico`
is still made by feed readers and link unfurlers, and 404 is a small avoidable miss.

**One regression, caught by measuring rather than looking.** Adding the mark pushed the
mobile header's brand text past its line: "Harbourline Law Group" beside a monogram needs
235px and a 390px phone has about 204 once the call link and menu toggle have taken theirs.
It wrapped to "Harbourline Law / Group" and took the sticky header from 60px to 72 on every
page. `business.shortName` &mdash; optional, falling back to `name`, used only by the header
&mdash; is the fix. Verified single-line at 320/360/390/430 and the full name from `sm` up.

**Dimensions are declared in `site.config.ts`** because `next/image` needs them and a logo
reached by a config string cannot be statically imported. Nothing reconciles them with the
files and the failure is silent &mdash; a re-export at a different crop leaves a subtly
stretched monogram on every page with no error anywhere &mdash; so `config/logo.test.ts`
reads the PNG headers and asserts they match. It is a live risk, not a hypothetical one:
the script re-derives the crop from the artwork on every run and prints the new numbers
precisely because it cannot apply them itself.

### 7.9 Two defects found by reading the page

Both were visible in a screenshot and neither is caught by any check we run.

**The chat launcher covered the footer's legal links.** It was a 121&times;44 "Chat with us"
pill, fixed at `right-6 bottom-6`. A launcher pinned to the viewport clears the page's
content only where the gutter is wider than the launcher, and at `max-w-6xl` (1152px) that
is **1442px of viewport for the pill** against **1296px for a 48px disc**. Measured at the
foot of `/attorneys`, the pill sat on top of `Terms` and `Image credits` at 390, 1024 and
1280 &mdash; and `Image credits` is the link that makes the photographers' attribution
reachable, which a CC BY licence requires.

Two changes, because neither is sufficient alone:

- The launcher is now a **48px disc** with the label on `aria-label`. That clears the
  content from 1280px up rather than 1442, and covers a quarter as much below it. Below
  ~1296px a viewport-fixed control necessarily floats over the page &mdash; that is what
  fixed means &mdash; so the claim here is "much less", not "never".
- `SiteFooter` takes **`hasFloatingAction`** and reserves 112px at the foot of the page when
  set. The prop is named for the shape of the problem rather than for the chatbot: the
  footer should not have to know what is floating over it. `app/layout.tsx` passes
  `isFeatureEnabled("aiChatbot")`, so a client with the flag off gets the original spacing.

Padding alone would have fixed only the bottom of the page; a smaller disc alone would have
left it still sitting on the legal row. The launcher also gained an explicit `z-30` &mdash;
under the header's `z-40`, so the 28rem panel cannot cross it on a short viewport.

**Attorney card excerpts were cut mid-word.** `line-clamp-4` clamps by _line_, so it cut
wherever the fourth line ran out: "…loser-pays costs regime changes th…", "…a Canadian
holding US-situs assets…". That reads as a rendering fault rather than an excerpt, and
because the cut point moves with the viewport there is no width at which the copy could
have been written to fit.

`lib/excerpt.ts` cuts at the last **whole sentence** inside a character budget instead.
Every bio opens with one self-contained sentence naming what that lawyer does, which is
exactly what a card wants; the rest is detail for the page the card links to. Its
abbreviation handling &mdash; initialisms, single initials, a short list of titles &mdash;
is a heuristic and is stated as one in the file: **anything it misreads cuts early, at a
full sentence**, so the failure mode is a shorter excerpt rather than a broken one. A word
boundary with an ellipsis is the fallback, used only when a single sentence outruns the
budget on its own. Nine unit tests, including the two real failures above.

**Verified:** launcher covers nothing in the footer at 390/1024/1280/1440; content overlap
gone from 1280 up (was 1440); all six excerpts end in a full stop and none overflows its
box; axe 0 violations; 895 tests.

### 7.10 The header

The nav was the one part of the site that told you nothing and did nothing: the
practice-area panels needed a click, no entry showed where you were, and between 768px and
1023px the whole bar broke.

**The panels open on hover — where hovering exists.** The old behaviour was click-only and
its stated reason was sound as far as it went: a hover menu is a trap on a touch screen,
where the first tap both opens the panel and follows the link under it. What it got wrong
was treating that as an argument against hover _everywhere_ rather than against hover _on
touch_. `hooks/use-media-query.ts::useHoverPointer` asks for
`(hover: hover) and (pointer: fine)` — a pointer that can be over something without having
committed to it. Everywhere else this is exactly the click menu it was. The query answers
`false` on the server and on the first client paint, so **click is what renders before
hydration**; hover is added, never assumed.

Two details are what separate a hover menu that works from one that is merely present:

- **No gap to fall through.** The panel's offset from the trigger is `pt-2` _inside_ the
  positioned element, not `mt-2` outside it, so the pointer never crosses dead space on the
  way down. A margin here is the commonest reason a hover menu feels broken.
- **Leaving is forgiven for 140ms.** Pointers travel in arcs; clipping the corner of the
  trigger on the way to the second item should not dismiss what you are reaching for.

Verified in a browser: opens on hover, survives the trip down into the panel, swaps cleanly
to the neighbouring menu, closes on leave and on Escape, and on a touch context ignores
`pointerenter` entirely while still opening on click.

**The panel is now a two-column card.** Six categories with a line of summary each is a
500px ribbon in one column — long enough that the last two sit below the fold on a laptop,
which is a strange thing to do to a menu. It animates in (140ms, the site's one easing
curve) and does **not** animate out: with hover, panels open and close constantly as you
sweep the nav, and an exit there reads as lag rather than polish.

**Where you are is now visible.** `lib/nav.ts::isCurrentSection` matches on a segment
boundary, so all 48 service pages mark the right half of the firm — exactly where a reader
is most likely to have lost track. `"/"` is excluded in the function rather than at the call
site, because it prefixes all 76 routes. Seven tests, including one that asserts the _real_
nav marks exactly one entry on every representative route.

Hover and current are deliberately **different** marks. Sharing one made the nav ambiguous
in the moment it mattered: hovering "For Individuals" while reading a `/business` page
underlined both and neither said which was which. The transient rule is `foreground/25`; the
permanent one is solid `primary`. On mobile the current entry takes a left rule instead —
a 300px underline under a full-width row reads as a divider.

**The desktop nav moved from `md` to `lg`, which was a real break.** Measured at 768, 820,
900 and 960: the two triggers wrapped to two lines (header 66px instead of 60) and at 768
and 820 the document itself scrolled sideways. The bar simply does not fit five entries, a
button and a wordmark until about 1000px. It now uses the mobile header up to 1024.

Two smaller things. The header lifts on a `shadow-sm` once scrolled, driven by an
**IntersectionObserver on a one-pixel sentinel** above the sticky element rather than a
scroll handler — no work on any frame where nothing crossed the top of the page, and the
header renders correctly before the observer has ever fired. And the logo link now closes
the mobile panel, which it did not: it is a sibling of the panel rather than a child, so it
was the one navigable thing that left the menu covering the page you had just chosen. It is
handled on click rather than in an effect on `pathname`, because that effect is the
cascading render the repo's lint rule rejects.

**Verified:** hover/click/keyboard/touch behaviours above; correct entry marked on 8 routes
and none on `/`; no wrap or sideways scroll at 768&ndash;1024; panel visible with no inline
opacity under `prefers-reduced-motion`; axe 0 violations; 902 tests.

### 7.11 The hero, and a contrast failure that had been there all along

Measured first: the section ran **711px at every desktop width** — content-driven, not
`70svh`-driven — and the copy ended at 660. The bottom 130px were empty navy at the point
the bottom gradient is densest, so the darkest and emptiest part of the site was also the
first thing anyone saw. The `max-w-3xl` copy column also left 384px of the container unused
at 1440.

**A row of three facts now runs the full width of the container** under a hairline: offices,
legal systems, practice areas. Full width rather than the copy's measure, which is what
stops the composition being a column of text beside a third of a frame doing nothing. The
practice-area count is counted from the content rather than typed, so it cannot drift from
what the site has. `/about` carries a four-number band; the overlap of two figures across
two pages is not duplication worth removing, since the homepage otherwise states none of it.

Stacked, that row added 349px on a 390px viewport and pushed the hero to **1043px** — a
whole screen before the page's first real section, which is a worse problem than the empty
band it was fixing. It is three across at every width, with the supporting line hidden below
`sm`; the labels carry a `min-h` there so the three numbers share a baseline when two of the
three labels wrap.

`items-end` on the section was also a no-op and had been since the photography landed: the
single child is `w-full` and carries the padding that sets the section's height, so there
was no slack to push against. It is `flex-col justify-end` now, which does what the class
always claimed on a tall viewport.

**The contrast pass found something older than this change.** Putting text across the full
width for the first time exposed the scrim's shape — the horizontal gradient is deliberately
transparent on the right — and the brass labels in columns two and three measured 4.46 and
4.23 against a 4.5 bar. Raising the bottom gradient's `via` stop from `ink/40` to `ink/60`
covers that band.

But the same run also showed **the lead paragraph at 4.16:1** on a phone over the bridge
photograph, and that was not new: the original pass sampled only the eyebrow and the `h1`,
so the lead and the location line had never been measured at all. It is opaque
`ink-foreground` now rather than `/85`, and every text run in the section is measured —
thirteen of them, 3 images &times; 2 viewports.

Two traps in the measurement itself are now recorded in the block:

- The first attempt reported ~1.0:1 for text that is plainly legible. **Tailwind v4 emits
  opacity modifiers as `color(srgb …)`, whose channels run 0&ndash;1**, and a number regex
  reads 0.93 as 0.93/255. The browser composites the colour over the sampled pixel through a
  1&times;1 canvas now, rather than any arithmetic in the script.
- The third stat came back at 1.08:1 against _paper_. The chat launcher floats over the
  hero's bottom-right corner on a phone, and its white glyph is not a backdrop.

### 7.12 The scrim was hiding the photographs, and the photographs were the reason

The hero read as a navy rectangle with a picture faintly behind it. Measured over the
region the copy sits in, the three frames were never comparable:

|                             | mean  | p99       | max   |
| --------------------------- | ----- | --------- | ----- |
| `toronto-skyline-blue-hour` | 0.262 | 0.345     | 0.376 |
| `brooklyn-bridge-dusk`      | 0.342 | **0.901** | 1.000 |
| `classical-colonnade-night` | 0.095 | **0.550** | 0.690 |

A scrim has to survive the worst frame, so **one photograph was setting the density for all
three** — and the darkest of them was being crushed to nothing to make the brightest one
legible. It also made the crossfade flash, one slide visibly brighter than its neighbours.

**`npm run hero:grade`** (`scripts/grade-hero-images.mjs`) multiplies each frame to a common
exposure first, reading from `design/hero-source/` — the files as licensed, kept outside
`/public` — and writing into `public/images/hero/`, which is now output and must not be
hand-edited. A multiply rather than a curve: it keeps the relative structure, so the tower,
the cables and the columns stay separable where an overlay flattens everything toward one
colour.

**It targets the 99th percentile, not the mean, and that correction mattered.** Grading on
the mean brought all three to ~0.17 and the check still failed on the _darkest_ frame:
the colonnade averages 0.095 but its lit stone reaches 0.690, and the check samples the
lightest pixel behind each glyph. On the mean those three look like two problems and one
innocent frame; on p99 they are what they are.

With that done the scrim drops from three heavy layers to four light ones, each with one
job — a floor, a vertical gradient for mobile where the copy spans the full width, a
horizontal one for desktop that is gone by the right-hand edge where the skyline is, and a
short, dense base. The base is deliberately the heaviest: the proof row runs the full width
down there, and `accent-on-ink` needs its backdrop under **0.026** relative luminance to
clear 4.5:1, which is the tightest text on the site.

**The check is committed now**, as `scripts/check-hero-contrast.py`
(`npm run check:hero-contrast`, needs `pip install playwright pillow`). It reads the
photograph list from `site.config.ts` rather than the DOM — the first version read the DOM
and silently measured one image instead of three, because `HeroSlideshow` defers mounting
every frame after the first, and a check that quietly narrows its own coverage is worse than
one that fails loudly. It reports **photograph visibility alongside the ratios**, because a
scrim dense enough to pass trivially is one that has hidden what it covers, and that is the
failure this whole section is about.

**Verified:** all 13 runs pass at 3 images &times; 2 viewports, worst 4.59 (`label2`, 12px
brass, bar 4.5). Margins up across the board against the pre-grade scrim — `h1` 4.79 &rarr;
5.55, lead 4.16 &rarr; 8.76, location 7.29 &rarr; 7.54 — while the photographs are visibly
photographs again. axe 0 violations; 902 tests.

### 7.13 One unreachable table took down all 76 routes

Neon became unreachable — DNS for `*.neon.tech` resolving to an address outside AWS and
port 5432 timing out, an environment fault rather than a code one — and the site returned
**500 on every page**, from `practiceAreaService.listOverrides`.

The fault was not the outage; it was that one read had no fallback. The kit had already
established the pattern and written down the reason: `getActiveTheme` and `listTeam` both
fail soft to config, "so a build with no reachable database still produces a
correct-looking site". `listPracticeAreas` was the only public read left without it — and
it is called from the **root layout**, to build the header menus, so its failure was every
route's failure.

That is the wrong way round. Config is the source of truth for practice areas; the table
holds four presentation booleans and two strings. A site whose content is entirely in the
repo was being taken down by the unavailability of optional tweaks to it.

Both public reads now fall back, and neither does so silently:

- `list-practice-areas.ts` returns an empty override map, so the site renders exactly as it
  did before anyone first opened the CMS.
- `get-available-slots.ts` returns no slots. An empty list was already a designed state
  there — the form lists every service whether or not anything is bookable, and the block
  shows the telephone number beside it. It is an honest degradation rather than a perfect
  one: a visitor is told "no times available" when the truth is "we cannot reach the
  calendar". Between that and an error page, the one that still carries a phone number wins,
  and the log line is what tells an operator which it was.

**Admin writes still throw.** Falling back on a read produces a correct-looking site;
falling back on a write is data loss that looks like success.

Three tests pin it, including the uncomfortable one: an empty override map means every item
defaults to visible, so **a practice area the firm had hidden reappears during an outage**.
That is a content decision being reversed by a network fault, and it is written down as
accepted behaviour rather than left to be discovered. Writing that test also surfaced a
pre-existing isolation bug — the flag-off case mutates module state and never restores it,
so any block added after it would have passed for the wrong reason.

**Verified:** all 8 public routes plus `/credits`, `/legal/*` and `/login` return 200 with
the database still unreachable; 905 tests.

### 7.14 A word in the headline that changes

Taken from a sibling portfolio project, which was pointed at as the thing to match. Exploring
it first was worth more than the effect itself: **its easing is `cubic-bezier(0.22, 1, 0.36, 1)`,
byte-identical to this repo's `Reveal`**, its `motion` is the same major, and its
reduced-motion contract is the same three-layer interlock already running here. The motion
vocabulary was never the difference. It had **one primitive this repo lacked**, and everything
else it does — a screenshot marquee behind the hero, a `mix-blend-difference` cursor ring,
brutalist hard shadows, route fades, scroll parallax — is either wrong for a law firm or was
ruled out as out of scope.

`components/motion/rotating-word.tsx` is the repo's third motion primitive. One word slides up
and out while the next slides up and in behind it, clipped by the box, **with no opacity fade** —
which is what makes it read as one crisp move rather than a dissolve. `HOLD_MS` is **3500**, not
the reference's 2400: the hero already carries a seven-second photograph crossfade, and two
perpetual animations on different periods read as a busy page rather than a lively one. At 3.5s
the word changes exactly twice per photograph, so the hero keeps one rhythm.

Three details are the ones a rewrite would drop, and each is commented in place: `inline-grid`
with both spans in one cell, a fixed-width ghost so nothing reflows, and `initial={false}` so the
first word does not slide in while the `Reveal` around it is already animating the same text.

**Six things went wrong, and every one was caught by something rather than noticed:**

1. **The `h1` is a Server Component; `spokenList` was exported from a `"use client"` module.**
   Runtime error — _"Attempted to call spokenList() from the server but spokenList is on the
   client"_. Every export of a client module is a client reference. The pure helpers moved to
   `lib/word-list.ts`, where `excerpt.ts` and `phone.ts` already live and where they always
   belonged.

2. **An `sr-only` sentence inside the heading polluted the heading's text.** `textContent`
   concatenates regardless of visibility, so the `<h1>` read
   _"…and newcomersemployersfounders"_ to anything parsing the rendered DOM. The fix is to
   label from outside — `aria-label` on the `<h1>`, built from `spokenList` — and to make the
   width ghost a `content: attr(...)` pseudo-element, which does not appear in `textContent`
   at all. The `<h1>` now reads _"Cross-border counsel for founders"_ and its accessible name
   is the full list.

3. **The contrast script silently stopped measuring two runs.** Splitting the hero's single
   `Reveal` into a `0 / 0.06 / 0.12` ladder moved the eyebrow and the lead into their own
   wrappers, and both were being found by `h1.previousElementSibling` /
   `nextElementSibling`. The run came back clean over **two fewer text runs than before**. They
   are found by `[data-hero-run]` now, and the script exits non-zero below an `EXPECTED_RUNS`
   floor — because a check that quietly narrows its own coverage is worse than one that fails.

4. **Brass at headline size did not clear its bar.** The plan asserted that large text needs only
   3:1 and brass would clear it comfortably. Measured: **2.84** against the colonnade on a phone.
   The assumption was wrong and the measurement is why it did not ship that way.

5. **Shorter headline copy moved every other run.** "Cross-border counsel for founders" is fewer
   lines than the old tagline, so the whole hero shortened and each text run landed somewhere
   new over the photographs — taking the eyebrow from 5.31 to **4.04**. Nothing about the
   eyebrow changed; the thing behind it did.

6. **The scrim was the wrong lever for (4) and (5).** Raising it moved the eyebrow 4.04 → 4.17
   and cost photograph visibility everywhere to fix one corner of one image. Lowering the
   grading target instead (§7.12) — `TARGET_LUMA` 0.26 → **0.20** — fixed it at 4.67 while the
   scrim went back to its lighter values. The photographs remain the right lever, as recorded.

**Verified:** all 14 runs pass, worst 4.59; `<h1>` height and bottom identical across a full
cycle at 1440 / 1280 / 1024 / 390, with all four words observed; the heading is reachable by its
full accessible name; under `prefers-reduced-motion` the word does not change in nine seconds
and no `[data-reveal]` is stranded; axe 0 violations; 914 tests.

### 7.15 Two daylight photographs joined a set graded for dusk

The client supplied two more hero frames and asked for them first. Both arrived in
`public/images/hero/`, which is script output — they belong in `design/hero-source/`, so they
were moved there, renamed to the set's convention, and `npm run hero:grade` regenerated
everything under /public.

They are far brighter than anything already in the set. Copy-zone p99 as supplied:

| frame                         | p99 as supplied | multiply |
| ----------------------------- | --------------- | -------- |
| `colonnade-professionals-day` | 0.961           | x0.443   |
| `boardroom-scales-harbour`    | 0.917           | x0.452   |
| `toronto-skyline-blue-hour`   | 0.345           | x0.705   |

**Hitting the same p99 is not the same as having the same distribution.** Graded to the
existing `TARGET_LUMA` of 0.20 every frame matched on paper — 0.210 to 0.224 — and the check
still failed, eyebrow at **4.29** against its 4.5 bar over the colonnade. A frame that is bright
nearly everywhere puts much more of its copy zone near p99 than a night shot does, so a 12px run
lands on lit stone that the darker frames do not contain anywhere.

The first fix was to grade harder — `TARGET_LUMA` 0.20 -> 0.16 — which cleared it at the cost
of ~8% of the mean luminance on all five frames. **That was the wrong fix, and 7.16 undoes it:**
the eyebrow was a block `<p>` spanning the full measure with its text in the left 15%, so the
check was sampling 1270px of photograph to judge a word occupying 190 of them. Sizing that
element to its content took it to 8.68 on its own. Check what the box actually covers before
darkening every photograph on the site to fix one number.

**Three things about this pair are unresolved, and are recorded rather than fixed:**

1. **They are 1376x768**, against 2400x1350 for the existing three and the 2400x1600 minimum in
   CLAUDE.md's onboarding checklist. The hero is full-bleed, so on any viewport wider than
   1376px they are upscaled and will read softer than their neighbours.
2. **`colonnade-professionals-day` is a photograph of people**, which contradicts the rule
   stated in `site.config.ts` since the photography landed: _"A stock portrait captioned into
   an invented firm's homepage is a claim about whoever is in it; a skyline is not."_ Two
   people in business dress on a law firm's homepage read as that firm's lawyers, and this
   firm does not exist.
3. **Both show Sydney Harbour** — the Opera House and the Harbour Bridge are identifiable in
   each — for a firm whose offices are Toronto and New York. Same category as the bank logo
   cropped out of the Toronto panorama: a recognisable landmark behind a firm's own hero reads
   as a claim about where it is.

Provenance is unknown for both, so `config/content/image-credits.ts` says exactly that rather
than inventing a photographer and a licence URL, per the onboarding checklist. Both also appear
machine-generated, which if true changes what "creator" and "licence" mean and should be settled
before any public deploy.

---

### 7.16 The hero was reported as too dark three times, and the blue was only half of it

Three rounds of "I can't see the hero image", each measured rather than eyeballed. What the
measurements kept showing is that the **scrim was not the binding constraint — the brass was.**

Every white run in the hero clears its bar several times over: `detail` at 10.4, `value` at
13.0, `eyebrow` at 7.4. Only the two `accent-on-ink` runs sat near theirs, and because the check
reports the worst pair anywhere, those two were holding all four scrim layers up on their own.

What actually moved, in order:

1. **Layer 4 reached 78% up the frame and nothing up there needed it.** The topmost run it
   exists to protect — the location line — ends at 32.6% of the section height. It was dimming
   the middle 45% of every frame, which on these photographs is the window, the walkway and the
   skyline. Pulled to `to-40%`.
2. **`accentOnInk` lifted twice**, `#BE8A33` -> `#CE9A44` -> `#DCAC57`. At the first value the
   proof labels needed their backdrop under 0.030 relative luminance; at the last they tolerate
   0.049. Same hue, one step of value each time, and it only ever helps the other places brass
   lands — all dark grounds.
3. **Layer 3 reshaped and layer 1 removed on desktop.** A flat wash dims the right-hand half as
   much as the left, which is the half meant to stay clear. The horizontal gradient now carries
   the work: 82% under the copy, nothing across the right-hand eighth. Its `via` sits at 52%
   because the `<h1>` runs to 65% of the measure; moving it to 58% proved the point in reverse,
   raising `lead` 4.85 -> 6.06 while the boardroom's highlights fell 0.101 -> 0.076.
4. **Every layer cut to 80%**, on request. That broke five runs, four of them brass, and was
   paid for from the text rather than by putting the blue back: **the three 12px proof labels
   went from brass to `ink-foreground/85`**. 12px against a 4.5 bar is the hardest text on the
   page and brass is the tightest colour on the site; the same words in white clear 10:1 over
   the same pixels, so the dark strip across the bottom could come off entirely. Brass stays in
   the headline, where it was asked for.
5. **One photograph was capping the whole set.** Measured as a ladder: with five frames 0.20
   passes, 0.22 lands the headline's brass at 3.02 against a 3.0 bar, 0.24 fails two runs, 0.28
   fails three. `classical-colonnade-night` failed first at every step — its lit stone columns
   reach 0.69 while the frame averages 0.095, and a percentile cannot fix a frame whose
   highlights are its subject. Retired to `design/hero-retired/` and dropped from
   `image-credits.ts`, since that file lists only what actually renders. **With it gone 0.24
   passes with wider margins than 0.20 had with it in.**

Desktop, brightest 5% of hero pixels — the statistic that decides whether a photograph reads as
present:

| state                       | mean            | brightest 5%    |
| --------------------------- | --------------- | --------------- |
| as reported                 | 0.015-0.026     | 0.040-0.076     |
| layer 4 pulled back         | 0.018-0.036     | 0.061-0.112     |
| brass lifted                | 0.019-0.044     | 0.078-0.133     |
| layer 3 reshaped            | 0.020-0.046     | 0.087-0.151     |
| every layer x0.8            | 0.024-0.051     | 0.094-0.158     |
| **colonnade retired, 0.24** | **0.027-0.059** | **0.123-0.187** |

**About 2.9x on the highlights, at zero contrast failures throughout.** Final margins:
`rotatingWord` 3.26/3.0, `h1` 3.94/3.0, `lead` 4.60/4.5, `label2` 5.38/4.5. Two intermediate
states were rejected for landing a run within 0.02 of its bar — a passing number with no margin
is not a passing design.

---

### 7.17 Every consultation tile pointed at an anchor this site no longer has

Reported by using the page: clicking any card under **Start with a conversation** put the
visitor back at the top of the homepage.

`ServicesGrid` built every card's href as `/?service=<slug>#booking`. That is the kit's shape
and it is correct there, because the kit's homepage renders `<Booking>` directly. This site
restructured in Phase 6: the homepage is hero / featured / audience split / cross-border /
consultations / contact, and the only `<section id="booking">` moved to `/consultation`. The
link therefore navigated to `/`, the browser looked for a `#booking` that no page on the site
carries any more, and stopped.

**Why nothing caught it.** A missing anchor target is not an error. The browser does not report
it, so there is no 404, no console warning and nothing for a build, a lint or 914 tests to fail
on. `config/nav.test.ts` exists for exactly this class of dead link — it was written after
`/attorneys` shipped in the header and 404'd for a whole phase — but it checks
`siteConfig.nav` and the layout's CTA, and it explicitly skips in-page anchors. This href was
neither: it is built inside a block. The same bug was already fixed once, for the header CTA,
when `#contact` became a link to nothing the moment the "Visit us" band moved into the footer
(§7.6). The grid was missed in that pass.

**The fix.** The destination is a prop, not a constant:

- `lib/services.ts::bookingCardHref(bookingPath, serviceSlug)` builds it, beside
  `slugifyCategory`, which already argues the case: a link whose two halves are written in two
  places drifts, and lands nowhere with no error anywhere.
- `ServicesGrid` takes `bookingHref`, defaulting to `"/"` so the single-page arrangement is
  unchanged. A block in `/components/blocks` must not learn a client's routes, which is why
  this is a prop rather than a config read.
- `app/page.tsx` passes `/consultation`.

The card stays a plain `<a>` rather than a `next/link`, and the reasoning changed with the
destination, so it is restated in the block: it is the one shape correct on both sides of the
prop. On a shared page a `<Link>` differing only in the query left the address bar on `/` with
the dropdown unset — measured, not assumed. Across routes a `<Link>` would work but buys
little, since `/consultation` is `force-dynamic` and has no prerendered payload to prefetch.
Either way the document load lets the browser honour `#booking` itself instead of depending on
`BookingForm`'s scroll effect.

`BookingForm` needed no change: it reads `?service=` from `useSearchParams()` and resolves it
against the bookable list before touching the dropdown, so an unknown slug is still ignored
(§9.8).

**The regression test is the point of the fix.** `config/nav.test.ts` gains the grid's
destination beside the header CTA it already pins, asserted as the literal the homepage
passes, with the same standing instruction: change the string and change the test in the same
commit. `lib/services.test.ts` covers `bookingCardHref` — slug encoding, and that `"/"` and
`"/consultation"` both yield one well-formed URL.

**Verified:** each of the four tiles lands on `/consultation?service=<its slug>#booking` with
that consultation preselected and the form in view; `?service=` naming something unknown
renders the page with the dropdown unset; the grid's **See available times** footer button is
unaffected.

## 9. Security

Non-negotiable, inherited from `SECURITY_REVIEW.md` and `CLAUDE.md`:

1. Every public POST goes through `guardPublicPost`; return `validationError()`, never raw
   Zod issues.
2. Every public form renders `<HoneypotInput>`; call `stripHoneypot()` before the service
   layer. Restyling a form must not drop it.
3. `escapeHtml` every interpolated value in outbound email, at interpolation.
4. Rate limiters key on `lib/client-ip.ts::clientIp`, never a raw header.
5. Admin pages and every mutating Server Action call `requireAdmin()` independently of
   `proxy.ts`.
6. `app/login/page.tsx` stays `force-dynamic`; the captcha stays inside `authorize()`.
7. No `any`; no unchecked assertions without a justifying comment.
8. Slugs arriving from URLs or query strings are resolved against config before use — never
   interpolated into a query, a template or an email unresolved.

---

## 10. Accessibility and performance

- WCAG 2.2 AA. The `HARBOUR` palette's contrast ratios are documented per-pair in
  `config/theme.presets.ts`; do not introduce colour outside those tokens.
- Interactive targets keep `pointer-coarse:min-h-11`.
- The FAQ accordion is keyboard-operable and its content is in the DOM for crawlers even
  when visually collapsed.
- Every image has real alt text, per `galleryImageSchema`'s stated rule.
- Targets: LCP < 2.5s, INP < 200ms, CLS < 0.1. Practice-area pages are statically
  generated, so this is mostly a matter of not regressing the hero image.

---

## 11. Build phases

Each phase ends in a state that lints, typechecks, builds and passes tests.

| #   | Phase                                                 | Done when                                                                                                                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | **DONE** &mdash; Repo setup (2.3) + Neon wiring (2.4) | 18 migrations applied to Neon over the derived direct URL; test DB on local Docker at 5433; audit/format/lint/typecheck/build/test all pass                                                                                                                                                                                                                 |
| 1   | **DONE** &mdash; Brand + theme                        | `site.config.ts` is Harbourline; bespoke `Harbourline` palette live with measured contrast; footer + inline disclaimers render; `robots.ts` disallows all; 6 safeguard tests green                                                                                                                                                                          |
| 2   | **DONE** &mdash; Content model                        | `practice-area.schema.ts` + both generated modules parse; all four `index.ts` invariants enforced at module load and covered by tests; 24 tests green; `services.ts` repurposed to consultation types                                                                                                                                                       |
| 3   | **DONE** &mdash; Public routing                       | 69 routes render (2 hubs + 12 categories + 48 services + 7 standalone); `generateStaticParams` + `generateMetadata` on every dynamic route; breadcrumbs with `BreadcrumbList` JSON-LD; sitemap enumerates all of them; cross-audience and cross-category URLs 404                                                                                           |
| 4   | **DONE** &mdash; Design pass                          | Homepage rebuilt for a law firm; `audience-split`, `firm-hero`, `cross-border-strip`, `practice-area-menu` built; header mega-menu works on desktop and mobile with Escape/focus return; two contrast failures found by screenshot and fixed; shadcn card/input/label/textarea/separator added                                                              |
| 5   | **DONE** &mdash; Lead capture                         | Schema + migration `20260917204750_lead_practice_area_context` applied to Neon and the test DB; `/contact?service=` prefills and hides the select; lead verified end-to-end in the browser and in the database with `audience` and `practiceAreaSlug` **derived server-side**; dashboard shows and filters by practice area; 17 new tests                   |
| 6   | **DONE** &mdash; Admin CMS                            | `PracticeAreaOverride` migrated to Neon and the test DB; `/dashboard/practice-areas` toggles visibility, featured, order and the two text overrides, with reset; hiding verified end-to-end &mdash; page 404s, drops from the hub, the sitemap **and the header menus**; featured drives a homepage strip; flag-off ignores every stored override; 26 tests |
| 7   | **DONE** &mdash; Attorneys                            | 6 fictional partners seeded from config; `/attorneys` and `/attorneys/[slug]` render with `Person` + `worksFor` JSON-LD and `ItemList` on the index; unknown slug 404s; attorney pages in the sitemap; `/attorneys` restored to the nav                                                                                                                     |
| 8   | **DONE** &mdash; SEO + polish                         | 76 sitemap URLs, every one verified 200; JSON-LD validated on 6 page types; **axe-core: 0 violations** across 11 pages x 2 viewports (WCAG 2.0/2.1/2.2 A + AA); request-level memoisation on the hot reads; 8.1 resolved below                                                                                                                              |

---

## 12. Verification

**Automated, run after every phase:**

```bash
npm run lint && npm run typecheck && npm run build
npm run test:db:setup && npm test
```

New tests this build must add:

- `config/content/practice-areas/index.test.ts` — the four §4.3 invariants, against a
  small `vi.mock` fixture **and** against the real content (this repo is not a shared
  template, so asserting on real content here is correct and is the only thing that
  catches a duplicate slug introduced by a content edit).
- `config/schema/practice-area.schema.test.ts` — rejects 3 or 5 key features, a bad slug,
  a 61-char `seo.title`, an empty `jurisdictions`.
- `features/practice-areas/api/list-practice-areas.test.ts` — override merge precedence,
  and that `visible: false` is excluded.
- `app/api/leads/route.test.ts` — extend for the new fields: an unknown `serviceSlug` is
  discarded, not stored. Uses the kit's required mocks (`next/headers` with a random
  `x-forwarded-for` per call, `@/auth`, `@/lib/features`).

**Manual walkthrough** (`npm run dev`, after `docker compose up -d`):

1. Home → audience split → `/business` → a category → a service. Breadcrumbs correct at
   every level.
2. On a service page: FAQs expand; related services link correctly; jurisdiction badges
   show US/CA.
3. Click the service CTA → `/contact` is prefilled with that service → submit → confirm
   the lead appears at `/dashboard/leads` with the right practice area and jurisdiction.
4. `/dashboard/practice-areas` → hide one category → confirm it disappears from
   `/business`, that its direct URL now 404s, and that it is gone from `/sitemap.xml`.
5. Override a service's summary → confirm the new text on the card and the detail page →
   reset to config → confirm the original returns.
6. `/consultation` → book a slot → confirm it appears at `/dashboard/bookings`.
7. View source on one service page and validate the `LegalService` and `FAQPage` JSON-LD.
8. Resize to 375px: mega-menu becomes a sheet, no horizontal scroll anywhere.

---

## 13. Out of scope / future

Client portal on the kit's `customerAccounts` feature · Stripe payments for flat-fee
services · an Insights/blog section · French content for Quebec · real attorney bios and
photography · a document-intake workflow using the kit's Postgres-backed upload pattern.

---

## Appendix A — Practice area inventory

Finalized 2026-09-17 from `BusinessToBusinessContent.md` and `BusinessToCustomer.md`.
**12 categories, 48 services, 60 unique slugs.** Validated: 4 key features and 3 FAQs on
every service; all `seo_title` <= 60 chars; all `seo_description` 150-160 chars; all 60
`icon` names verified against `lucide-react@1.28.0` as installed in the starter kit.

### Business (B2B) — `/business`

| #   | Category                                       | slug                                       | Services (slug)                                                                                                                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Corporate & Commercial Law**                 | `corporate-commercial`                     | Business Formation & Structuring (`business-formation-structuring`)<br>Contract Drafting, Review & Negotiation (`commercial-contract-drafting`)<br>Mergers, Acquisitions & Joint Ventures (`mergers-acquisitions-joint-ventures`)<br>Corporate Governance & Compliance (`corporate-governance-compliance`)                                                         |
| 2   | **Intellectual Property**                      | `intellectual-property`                    | Patent Drafting & Prosecution (`patent-drafting-prosecution`)<br>Trademark Registration & Brand Protection (`trademark-brand-protection`)<br>Copyright Licensing & Enforcement (`copyright-licensing-enforcement`)<br>Trade Secret Protection & NDAs (`trade-secret-protection-ndas`)                                                                              |
| 3   | **Employment & Labour Law (Management Side)**  | `employment-labour`                        | Employment Agreements & Workplace Policies (`employment-agreements-policies`)<br>Discrimination, Harassment & Wrongful Dismissal Defense (`wrongful-dismissal-defense`)<br>Union Relations & Collective Bargaining (`union-relations-collective-bargaining`)<br>Wage, Hour & Workplace Safety Compliance (`wage-hour-safety-compliance`)                           |
| 4   | **Real Estate & Construction Law**             | `real-estate-construction`                 | Commercial Zoning, Land Use & Development Approvals (`zoning-land-use-approvals`)<br>Commercial Leasing & Property Acquisitions (`commercial-leasing-acquisitions`)<br>Construction Contracts & Lien Disputes (`construction-contracts-lien-disputes`)<br>Property Tax Assessment, Expropriation & Eminent Domain Disputes (`property-tax-expropriation-disputes`) |
| 5   | **Data Privacy, Cybersecurity & Technology**   | `privacy-cybersecurity-technology`         | Privacy Compliance Programs (`privacy-compliance-programs`)<br>Data Breach Response & Mandatory Notification (`data-breach-response-notification`)<br>SaaS, Cloud & AI Vendor Contracting (`saas-cloud-ai-vendor-contracting`)<br>Technology Transactions & Data Licensing (`technology-transactions-data-licensing`)                                              |
| 6   | **Commercial Litigation & Dispute Resolution** | `commercial-litigation-dispute-resolution` | Breach of Contract & Commercial Tort Claims (`breach-of-contract-claims`)<br>Shareholder, Partnership & Oppression Remedy Disputes (`shareholder-oppression-disputes`)<br>Arbitration & Mediation (`arbitration-mediation`)<br>Insolvency, Restructuring & Creditor Remedies (`insolvency-restructuring-creditor-remedies`)                                        |

### Individuals (B2C) — `/individuals`

| #   | Category                                    | slug                      | Services (slug)                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Personal Injury & Torts**                 | `personal-injury`         | Motor Vehicle Accident Claims (`motor-vehicle-accidents`)<br>Medical Malpractice and Clinical Negligence (`medical-malpractice`)<br>Slip, Trip and Fall Injuries (`slip-and-fall-injuries`)<br>Product and Prescription Drug Injuries (`product-and-drug-injuries`)                                                     |
| 2   | **Family Law & Domestic Relations**         | `family-law`              | Divorce and Separation (`divorce-and-separation`)<br>Parenting Time and Decision-Making (`parenting-time-and-decision-making`)<br>Child and Spousal Support (`child-and-spousal-support`)<br>Marriage Contracts and Cohabitation Agreements (`marriage-and-cohabitation-agreements`)                                    |
| 3   | **Estate Planning & Estate Administration** | `estate-planning`         | Wills and Powers of Attorney (`wills-and-powers-of-attorney`)<br>Trusts and Wealth Transfer Planning (`trusts-and-wealth-transfer`)<br>Estate Administration and Probate (`estate-administration-and-probate`)<br>Guardianship and Capacity Applications (`guardianship-and-capacity`)                                  |
| 4   | **Criminal Defence & Records**              | `criminal-defence`        | Impaired Driving Defence (`impaired-driving-defence`)<br>Fraud and White-Collar Defence (`fraud-and-white-collar-defence`)<br>Criminal Charges and Trials (`criminal-charges-and-trials`)<br>Bail, Record Suspensions and Expungement (`bail-and-record-clearing`)                                                      |
| 5   | **Residential Real Estate**                 | `residential-real-estate` | Home Purchases and Sales (`home-purchases-and-sales`)<br>Title Searches and Title Insurance (`title-searches-and-title-insurance`)<br>Property Line, Easement and Neighbour Disputes (`property-line-and-easement-disputes`)<br>Landlord and Tenant Matters (`landlord-and-tenant-matters`)                             |
| 6   | **Immigration & Citizenship**               | `immigration-citizenship` | Family Sponsorship and Spousal Immigration (`family-sponsorship`)<br>Work Permits, Study Permits and Employment Visas (`work-and-study-permits`)<br>Permanent Residence and Green Cards (`permanent-residence-and-green-cards`)<br>Citizenship, Appeals and Removal Defence (`citizenship-appeals-and-removal-defence`) |
