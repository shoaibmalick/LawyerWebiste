import { cache } from "react";
import { connection } from "next/server";
import {
  listAllPracticeAreas,
  listPracticeAreas as listFromConfig,
} from "@/config/content/practice-areas";
import type { Audience, LegalService, PracticeArea } from "@/config/schema/practice-area.schema";
import { isFeatureEnabled } from "@/lib/features";
import { practiceAreaService } from "@/server/services/practiceAreaService";

/**
 * Config, with the firm's own decisions applied.
 *
 * Config is the source of truth and the fallback. The database contributes four
 * presentation decisions and two strings, and contributes nothing at all when
 * the table is empty or the feature is off. Everything a visitor reads -
 * descriptions, key features, FAQs, SEO text - comes from the generated content
 * modules in every case.
 *
 * `visible: false` removes an item from this list entirely rather than flagging
 * it, so a caller cannot forget to check. The routes call `findVisibleService`
 * and `findVisiblePracticeArea` below and 404 on a miss, which is what makes
 * hiding mean *unreachable* rather than *unlisted*.
 */

export type ResolvedService = LegalService & { featured: boolean };
export type ResolvedPracticeArea = Omit<PracticeArea, "services"> & {
  featured: boolean;
  services: ResolvedService[];
};

type OverrideRow = {
  visible: boolean;
  featured: boolean;
  sortOrder: number | null;
  summaryOverride: string | null;
  ctaOverride: string | null;
};

/**
 * The firm's own decisions, or none of them if the database cannot be reached.
 *
 * Config is the source of truth here and the table holds only presentation, so
 * an unreachable database means the site renders exactly as it did before
 * anyone first opened the CMS. That is a correct-looking site, not a broken
 * one — and it is the same call `listTeam` and `getActiveTheme` already make,
 * for the same reason.
 *
 * Found the hard way. With Neon unreachable, `listOverrides` threw and **every
 * one of the 76 routes returned 500**, because this read is in the root
 * layout's header menus: a table of optional presentation tweaks was taking
 * down a site whose content is entirely in the repo. It was also the only
 * public read left without a fallback.
 *
 * Deliberately not silent. An operator seeing config-only content needs to know
 * the CMS is not being applied, and the admin write paths still throw — a save
 * that cannot reach the database must fail loudly rather than appear to work.
 */
async function readOverrides(): Promise<Map<string, OverrideRow>> {
  try {
    return await practiceAreaService.listOverrides();
  } catch (error) {
    console.error("[practice-areas] could not read overrides; falling back to config", error);
    return new Map();
  }
}

function applyService(service: LegalService, override: OverrideRow | undefined): ResolvedService {
  return {
    ...service,
    summary: override?.summaryOverride ?? service.summary,
    cta: override?.ctaOverride ?? service.cta,
    featured: override?.featured ?? false,
  };
}

/**
 * Memoised per request with React's `cache`.
 *
 * The layout alone calls this twice - once for each audience's header menu -
 * and a page that also renders a hub or a featured strip calls it again. Every
 * one of those was its own round trip to Neon for the same handful of override
 * rows, which is measurable when the database is in another region: the
 * layout's reads put ~235ms on the floor of *every* page, including /about and
 * /legal/disclaimer, which have no data of their own.
 *
 * `cache` dedupes within a single request and nothing beyond it, so there is no
 * staleness to reason about: a change saved in the CMS is visible on the very
 * next request. It is the right scope for this - a cross-request cache here
 * would need an invalidation path, which is the thing getActiveTheme
 * deliberately declined to build.
 */
const resolveAll = cache(async function resolveAll(): Promise<ResolvedPracticeArea[]> {
  /*
   * Reads live database state, so the caller must not be statically rendered
   * with a frozen copy. `connection()` is how getActiveTheme states the same
   * requirement, and it is not optional: without it, hiding a practice area
   * would change nothing until the next deploy - which is precisely the thing
   * this feature exists to avoid.
   */
  await connection();

  // Flag off means config only. Not merely "hide the editor": whatever was last
  // saved must stop applying too, or turning the feature off leaves a stale
  // decision silently in force.
  if (!isFeatureEnabled("practiceAreasCms")) {
    return listAllPracticeAreas().map((area) => ({
      ...area,
      featured: false,
      services: area.services.map((service) => ({ ...service, featured: false })),
    }));
  }

  const overrides = await readOverrides();

  const areas = listAllPracticeAreas()
    .map((area) => {
      const override = overrides.get(area.slug);

      return {
        area: {
          ...area,
          // The category's one overridable string is its tagline - the line
          // under the name on a hub card. There is no separate summary.
          tagline: override?.summaryOverride ?? area.tagline,
          featured: override?.featured ?? false,
          services: area.services
            .map((service, index) => {
              const serviceOverride = overrides.get(service.slug);
              return {
                service: applyService(service, serviceOverride),
                visible: serviceOverride?.visible ?? true,
                // Falls back to the position in config, NOT to 0. Treating
                // "unset" as zero would bunch every un-reordered service at the
                // front and shuffle them against each other.
                order: serviceOverride?.sortOrder ?? index,
              };
            })
            .filter((entry) => entry.visible)
            .sort((a, b) => a.order - b.order)
            .map((entry) => entry.service),
        },
        visible: override?.visible ?? true,
        // Same reasoning: config's `order` is contiguous from 1, so an item
        // with no override sorts among the others rather than jumping ahead.
        order: override?.sortOrder ?? area.order,
      };
    })
    .filter((entry) => entry.visible)
    .sort((a, b) => a.order - b.order);

  return areas.map((entry) => entry.area);
});

/** Visible categories for one audience, in the firm's chosen order. */
export async function listPracticeAreas(audience: Audience): Promise<ResolvedPracticeArea[]> {
  const all = await resolveAll();
  return all.filter((area) => area.audience === audience);
}

/** Every visible category, both audiences. */
export async function listAllResolvedPracticeAreas(): Promise<ResolvedPracticeArea[]> {
  return resolveAll();
}

/**
 * A category, only if it is visible.
 *
 * Returns undefined for a hidden one, which the route turns into a 404. The
 * config-backed `findPracticeArea` still exists and is still correct for places
 * that need to resolve a slug regardless of visibility - the lead dashboard
 * labelling an old lead, for instance, where hiding a category should not erase
 * the record of somebody having asked about it.
 */
export async function findVisiblePracticeArea(
  audience: Audience,
  slug: string,
): Promise<ResolvedPracticeArea | undefined> {
  const areas = await listPracticeAreas(audience);
  return areas.find((area) => area.slug === slug);
}

export async function findVisibleService(
  audience: Audience,
  categorySlug: string,
  serviceSlug: string,
): Promise<{ area: ResolvedPracticeArea; service: ResolvedService } | undefined> {
  const area = await findVisiblePracticeArea(audience, categorySlug);
  if (!area) return undefined;

  const service = area.services.find((entry) => entry.slug === serviceSlug);
  return service ? { area, service } : undefined;
}

/** Everything promoted, for the homepage strip. Empty renders nothing. */
export async function listFeatured(): Promise<
  { area: ResolvedPracticeArea; service: ResolvedService }[]
> {
  const areas = await resolveAll();
  return areas.flatMap((area) =>
    area.services.filter((service) => service.featured).map((service) => ({ area, service })),
  );
}

/** Route params for the sitemap and anywhere else enumerating visible pages. */
export async function visibleServiceRoutes() {
  const areas = await resolveAll();
  return areas.flatMap((area) =>
    area.services.map((service) => ({
      audience: area.audience,
      category: area.slug,
      service: service.slug,
    })),
  );
}

export async function visibleCategoryRoutes() {
  const areas = await resolveAll();
  return areas.map((area) => ({ audience: area.audience, category: area.slug }));
}

/** Config-only view, for the admin table: it must show hidden items too. */
export function listConfigPracticeAreas(audience: Audience): PracticeArea[] {
  return listFromConfig(audience);
}
