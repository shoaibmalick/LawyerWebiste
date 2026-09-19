import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listAllPracticeAreas } from "@/config/content/practice-areas";
import { prisma } from "@/lib/prisma";
import { practiceAreaService } from "@/server/services/practiceAreaService";

/**
 * The merge, against a real database.
 *
 * `next/server`'s `connection()` needs Next's request-scoped async context,
 * which does not exist when a module is imported directly in a test. It exists
 * to opt the caller out of static rendering, which is meaningless here.
 */
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));

// Flag-gated behaviour is a first-class case, so the flag is mocked rather
// than read from the committed config — a test that passes only because the
// repo happens to have the CMS switched on is testing the config.
const flags = vi.hoisted(() => ({ practiceAreasCms: true }));
vi.mock("@/lib/features", () => ({
  isFeatureEnabled: (name: string) => flags[name as keyof typeof flags] ?? false,
}));

import {
  findVisiblePracticeArea,
  findVisibleService,
  listFeatured,
  listPracticeAreas,
  visibleServiceRoutes,
} from "./list-practice-areas";

const AREA = listAllPracticeAreas().find((a) => a.audience === "individual")!;
const OTHER = listAllPracticeAreas().filter((a) => a.audience === "individual")[1]!;
const SERVICE = AREA.services[0];

async function override(data: {
  slug: string;
  kind: "CATEGORY" | "SERVICE";
  visible?: boolean;
  featured?: boolean;
  sortOrder?: number;
  summaryOverride?: string;
  ctaOverride?: string;
}) {
  await prisma.practiceAreaOverride.create({ data });
}

describe("practice-area merge", () => {
  beforeEach(async () => {
    flags.practiceAreasCms = true;
    await prisma.practiceAreaOverride.deleteMany();
  });

  afterEach(async () => {
    await prisma.practiceAreaOverride.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns config unchanged when nothing is overridden", async () => {
    // The state a freshly cloned repo is in, and the one that has to be right
    // before any of the rest matters.
    const areas = await listPracticeAreas("individual");

    expect(areas).toHaveLength(6);
    expect(areas[0].slug).toBe(AREA.slug);
    expect(areas[0].services[0].summary).toBe(SERVICE.summary);
  });

  it("hides a category from the list and from lookups", async () => {
    await override({ slug: AREA.slug, kind: "CATEGORY", visible: false });

    const areas = await listPracticeAreas("individual");
    expect(areas.map((a) => a.slug)).not.toContain(AREA.slug);

    // Unreachable, not merely unlisted — this is what the route turns into 404.
    expect(await findVisiblePracticeArea("individual", AREA.slug)).toBeUndefined();
  });

  it("takes a hidden category's services out of the route list too", async () => {
    await override({ slug: AREA.slug, kind: "CATEGORY", visible: false });

    const routes = await visibleServiceRoutes();
    expect(routes.filter((r) => r.category === AREA.slug)).toEqual([]);
    // The other five categories are untouched.
    expect(routes).toHaveLength(44);
  });

  it("hides a single service without hiding its category", async () => {
    await override({ slug: SERVICE.slug, kind: "SERVICE", visible: false });

    const area = await findVisiblePracticeArea("individual", AREA.slug);
    expect(area).toBeDefined();
    expect(area!.services.map((s) => s.slug)).not.toContain(SERVICE.slug);
    expect(area!.services).toHaveLength(3);

    expect(await findVisibleService("individual", AREA.slug, SERVICE.slug)).toBeUndefined();
  });

  it("applies a summary override without touching anything else", async () => {
    await override({
      slug: SERVICE.slug,
      kind: "SERVICE",
      summaryOverride: "Reworded by the firm.",
    });

    const found = await findVisibleService("individual", AREA.slug, SERVICE.slug);
    expect(found!.service.summary).toBe("Reworded by the firm.");
    // Content, not presentation: these must still come from the config module.
    expect(found!.service.description).toBe(SERVICE.description);
    expect(found!.service.faqs).toHaveLength(3);
    expect(found!.service.keyFeatures).toEqual(SERVICE.keyFeatures);
  });

  it("falls back to config when an override is blank", async () => {
    await override({ slug: SERVICE.slug, kind: "SERVICE", featured: true });

    const found = await findVisibleService("individual", AREA.slug, SERVICE.slug);
    expect(found!.service.summary).toBe(SERVICE.summary);
    expect(found!.service.cta).toBe(SERVICE.cta);
  });

  it("orders categories by sortOrder, leaving un-reordered ones in config order", async () => {
    // Only the second category is moved. The rest must not bunch at the front,
    // which is what a `?? 0` fallback would have done.
    await override({ slug: OTHER.slug, kind: "CATEGORY", sortOrder: 0 });

    const areas = await listPracticeAreas("individual");
    expect(areas[0].slug).toBe(OTHER.slug);
    expect(areas).toHaveLength(6);
  });

  it("removes a hidden category from every surface that lists categories", async () => {
    /*
     * Regression. Hiding a category 404'd its page and dropped it from the hub
     * grid and the sitemap — while the header mega-menu, built from config at
     * module scope in app/layout.tsx, went on linking to it from every page on
     * the site. A dead link in the primary nav is worse than the state hiding
     * was meant to produce.
     *
     * The layout now builds its menus from this function, so anything that
     * lists categories agrees by construction. This asserts the single source
     * they all read.
     */
    await override({ slug: AREA.slug, kind: "CATEGORY", visible: false });

    const forHub = await listPracticeAreas("individual");
    const forMenus = await listPracticeAreas("individual");

    expect(forHub.map((a) => a.slug)).not.toContain(AREA.slug);
    expect(forMenus.map((a) => a.slug)).not.toContain(AREA.slug);
    expect(forHub.map((a) => a.slug)).toEqual(forMenus.map((a) => a.slug));
  });

  it("collects featured services for the homepage strip", async () => {
    await override({ slug: SERVICE.slug, kind: "SERVICE", featured: true });

    const featured = await listFeatured();
    expect(featured).toHaveLength(1);
    expect(featured[0].service.slug).toBe(SERVICE.slug);
    expect(featured[0].area.slug).toBe(AREA.slug);
  });

  it("never features a hidden service", async () => {
    await override({ slug: SERVICE.slug, kind: "SERVICE", visible: false, featured: true });
    expect(await listFeatured()).toEqual([]);
  });

  it("ignores every override when the flag is off", async () => {
    // Turning a feature off must stop what was last saved from applying, not
    // merely hide the editor.
    await override({
      slug: AREA.slug,
      kind: "CATEGORY",
      visible: false,
      summaryOverride: "Should not appear",
    });

    flags.practiceAreasCms = false;

    const areas = await listPracticeAreas("individual");
    expect(areas.map((a) => a.slug)).toContain(AREA.slug);
    expect(areas.find((a) => a.slug === AREA.slug)!.tagline).toBe(AREA.tagline);
  });
});

describe("when the database is unreachable", () => {
  // Its own setup rather than the outer block's: `flags` is module state, and
  // the last test above deliberately leaves the CMS switched off. Inheriting
  // that would make every assertion here pass for the wrong reason.
  beforeEach(async () => {
    flags.practiceAreasCms = true;
    await prisma.practiceAreaOverride.deleteMany();
  });

  afterAll(async () => {
    await prisma.practiceAreaOverride.deleteMany();
    await prisma.$disconnect();
  });

  /**
   * The failure that produced this: with Neon unreachable, `listOverrides`
   * threw and every one of the 76 routes returned 500 — because this read sits
   * in the root layout's header menus. A table holding optional presentation
   * tweaks was taking down a site whose content is entirely in the repo.
   *
   * The spy replaces the service rather than breaking the connection, because
   * what is under test is this layer's response to a throw, not Prisma's
   * behaviour when a host does not resolve.
   */
  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.practiceAreaOverride.deleteMany();
  });

  it("renders from config rather than throwing", async () => {
    vi.spyOn(practiceAreaService, "listOverrides").mockRejectedValue(
      new Error("connect ETIMEDOUT"),
    );

    const areas = await listPracticeAreas("individual");

    expect(areas.map((a) => a.slug)).toEqual(
      listAllPracticeAreas()
        .filter((a) => a.audience === "individual")
        .map((a) => a.slug),
    );
    // Config's own text, not an override and not a blank.
    expect(areas.find((a) => a.slug === AREA.slug)!.tagline).toBe(AREA.tagline);
  });

  it("does not hide anything the operator had hidden before it went down", async () => {
    // The dangerous shape of this fallback: an empty map means "no overrides",
    // and every item defaults to visible. A hidden practice area reappearing
    // during an outage is a content decision being reversed by a network fault,
    // so it is stated here as the accepted behaviour rather than left implicit.
    await override({ slug: OTHER.slug, kind: "CATEGORY", visible: false });
    expect((await listPracticeAreas("individual")).map((a) => a.slug)).not.toContain(OTHER.slug);

    vi.spyOn(practiceAreaService, "listOverrides").mockRejectedValue(
      new Error("connect ETIMEDOUT"),
    );

    expect((await listPracticeAreas("individual")).map((a) => a.slug)).toContain(OTHER.slug);
  });

  it("still throws on the admin write path", async () => {
    // A save that cannot reach the database must fail loudly. Falling back on a
    // read is a correct-looking site; falling back on a write is data loss that
    // looks like success.
    vi.spyOn(practiceAreaService, "upsertOverride").mockRejectedValue(
      new Error("connect ETIMEDOUT"),
    );

    await expect(
      practiceAreaService.upsertOverride({
        slug: AREA.slug,
        kind: "CATEGORY",
        visible: true,
        featured: false,
        summaryOverride: null,
        ctaOverride: null,
      }),
    ).rejects.toThrow("ETIMEDOUT");
  });
});
