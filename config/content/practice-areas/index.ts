import {
  AUDIENCES,
  type Audience,
  type LegalService,
  type PracticeArea,
} from "@/config/schema/practice-area.schema";
import { practiceAreas as businessAreas } from "./business";
import { practiceAreas as individualAreas } from "./individual";

/**
 * The practice-area content, cross-checked and indexed.
 *
 * `practiceAreasSchema.parse` runs inside each generated module, but a schema
 * only ever sees one value at a time. The four things that can actually go wrong
 * with this content are all relationships *between* entries - two services
 * sharing a slug, a related-service link pointing at nothing, a category
 * numbered 7 in a list of six - and none of them are visible from inside a
 * single `.parse`. So they are checked here, at module load, and they throw.
 *
 * Throwing is the point. These are content bugs, and the alternative to a boot
 * failure is a page that renders a dead link, or a route that silently shadows
 * another. The content modules are produced by a script; if that script ever
 * emits something incoherent, the build should stop rather than publish it.
 */

/**
 * URL segment per audience.
 *
 * `individual` reads better as a noun in code and worse in a URL - /individuals
 * is what a visitor expects, and what the header and footer both link to. One
 * constant, so the two spellings cannot drift.
 */
export const AUDIENCE_SEGMENT = {
  business: "business",
  individual: "individuals",
} as const satisfies Record<Audience, string>;

export type AudienceSegment = (typeof AUDIENCE_SEGMENT)[Audience];

const SEGMENT_TO_AUDIENCE = Object.fromEntries(
  Object.entries(AUDIENCE_SEGMENT).map(([audience, segment]) => [segment, audience]),
) as Record<string, Audience | undefined>;

/** Resolve a URL segment back to an audience. Undefined for anything else. */
export function audienceFromSegment(segment: string): Audience | undefined {
  return SEGMENT_TO_AUDIENCE[segment];
}

const BY_AUDIENCE: Record<Audience, PracticeArea[]> = {
  business: businessAreas,
  individual: individualAreas,
};

const ALL_AREAS: PracticeArea[] = [...businessAreas, ...individualAreas];

export type ServiceLocation = {
  area: PracticeArea;
  service: LegalService;
};

/* ------------------------------------------------------------------ *
 * Invariants. Order matters: check 2 builds the slug index that
 * check 3 needs.
 * ------------------------------------------------------------------ */

function fail(invariant: string, detail: string): never {
  throw new Error(
    `Practice-area content is invalid (${invariant}).\n\n  ${detail}\n\n` +
      `The content modules are generated from BusinessToBusinessContent.md and ` +
      `BusinessToCustomer.md. Fix the markdown, then run: npm run content:generate`,
  );
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

// 1. Category slugs are unique across both audiences. They are not namespaced by
//    audience in any lookup, so two categories sharing one would make
//    findPracticeArea return whichever happened to come first.
{
  const dupes = duplicates(ALL_AREAS.map((area) => area.slug));
  if (dupes.length > 0) fail("duplicate category slug", dupes.join(", "));
}

// 2. Service slugs are unique across BOTH audiences, not merely within a
//    category. A service slug is globally addressable - findService takes it
//    alone, and /contact?service= carries it - so a collision would make one of
//    the two pages permanently unreachable.
const SERVICE_INDEX = new Map<string, ServiceLocation>();
{
  const dupes = duplicates(
    ALL_AREAS.flatMap((area) => area.services.map((service) => service.slug)),
  );
  if (dupes.length > 0) fail("duplicate service slug", dupes.join(", "));

  for (const area of ALL_AREAS) {
    for (const service of area.services) {
      SERVICE_INDEX.set(service.slug, { area, service });
    }
  }
}

// 3. Every relatedSlugs entry resolves. These render as links, and a dangling
//    one is a 404 no test of the page would catch: the href is a perfectly valid
//    string, and the failure only happens when somebody clicks it.
{
  const dangling: string[] = [];
  for (const [slug, { service }] of SERVICE_INDEX) {
    for (const related of service.relatedSlugs) {
      if (related === slug) dangling.push(`${slug} -> itself`);
      else if (!SERVICE_INDEX.has(related)) dangling.push(`${slug} -> ${related}`);
    }
  }
  if (dangling.length > 0) fail("related service does not exist", dangling.join("; "));
}

// 4. `order` is contiguous from 1 within each audience. A gap or a repeat is not
//    fatal to rendering - the sort still produces *an* order - which is exactly
//    why it needs asserting: it would ship as a quietly wrong menu.
for (const audience of AUDIENCES) {
  const orders = BY_AUDIENCE[audience].map((area) => area.order).sort((a, b) => a - b);
  const expected = orders.map((_, index) => index + 1);
  if (orders.join(",") !== expected.join(",")) {
    fail(
      "category order is not contiguous from 1",
      `${audience}: got [${orders.join(", ")}], expected [${expected.join(", ")}]`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

/** Categories for one audience, in display order. */
export function listPracticeAreas(audience: Audience): PracticeArea[] {
  return [...BY_AUDIENCE[audience]].sort((a, b) => a.order - b.order);
}

/** Every category, both audiences, business first. */
export function listAllPracticeAreas(): PracticeArea[] {
  return AUDIENCES.flatMap((audience) => listPracticeAreas(audience));
}

export function findPracticeArea(audience: Audience, slug: string): PracticeArea | undefined {
  return BY_AUDIENCE[audience].find((area) => area.slug === slug);
}

/**
 * A service by its slug alone, with the category it belongs to.
 *
 * The category comes back because every caller needs it - to build the URL, the
 * breadcrumb, or the "back to" link - and looking it up separately is how those
 * drift apart.
 */
export function findService(slug: string): ServiceLocation | undefined {
  return SERVICE_INDEX.get(slug);
}

export type ServiceRoute = {
  audience: Audience;
  segment: AudienceSegment;
  category: string;
  service: string;
};

/**
 * Every service route, in page order.
 *
 * The single source for `generateStaticParams` and `app/sitemap.ts` both. Those
 * two disagreeing is the classic way a sitemap ends up advertising URLs that
 * 404, so they are not allowed to be written twice.
 */
export function allServiceRoutes(): ServiceRoute[] {
  return listAllPracticeAreas().flatMap((area) =>
    area.services.map((service) => ({
      audience: area.audience,
      segment: AUDIENCE_SEGMENT[area.audience],
      category: area.slug,
      service: service.slug,
    })),
  );
}

/** Every category route, in page order. */
export function allCategoryRoutes(): Omit<ServiceRoute, "service">[] {
  return listAllPracticeAreas().map((area) => ({
    audience: area.audience,
    segment: AUDIENCE_SEGMENT[area.audience],
    category: area.slug,
  }));
}

/** The public path for a service, so no caller builds this string by hand. */
export function servicePath(area: PracticeArea, service: LegalService): string {
  return `/${AUDIENCE_SEGMENT[area.audience]}/${area.slug}/${service.slug}`;
}

export function practiceAreaPath(area: PracticeArea): string {
  return `/${AUDIENCE_SEGMENT[area.audience]}/${area.slug}`;
}
