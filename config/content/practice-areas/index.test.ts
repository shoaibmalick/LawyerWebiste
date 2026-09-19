import { describe, expect, it } from "vitest";
import {
  AUDIENCE_SEGMENT,
  allCategoryRoutes,
  allServiceRoutes,
  audienceFromSegment,
  findPracticeArea,
  findService,
  listAllPracticeAreas,
  listPracticeAreas,
  practiceAreaPath,
  servicePath,
} from "@/config/content/practice-areas";
import {
  practiceAreaSchema,
  practiceAreasSchema,
  type PracticeArea,
} from "@/config/schema/practice-area.schema";

/**
 * Two halves, and they are testing different things.
 *
 * The first asserts against the **real content**, which the kit's conventions
 * normally forbid: a test coupled to one client's slugs breaks in every other
 * client repo. That rule exists for a shared template, and this repo is not one
 * - it has a single set of content, generated from two markdown files, and a
 * duplicate slug introduced by a content edit is exactly the bug worth catching.
 * Asserting against a fixture here would test the fixture.
 *
 * The second half feeds deliberately broken content to the same invariants, by
 * re-implementing them over a fixture. That is the only way to prove a guard
 * actually fires: `index.ts` throws at module load, so a test cannot import it
 * twice with different data, and a guard nobody has ever seen trigger is
 * indistinguishable from a guard that does nothing.
 */

const ALL = listAllPracticeAreas();
const ALL_SERVICES = ALL.flatMap((area) => area.services);

describe("practice-area content (the real thing)", () => {
  it("is 12 categories and 48 services", () => {
    expect(ALL).toHaveLength(12);
    expect(ALL_SERVICES).toHaveLength(48);
  });

  it("splits six and six between the two audiences", () => {
    expect(listPracticeAreas("business")).toHaveLength(6);
    expect(listPracticeAreas("individual")).toHaveLength(6);
  });

  it("has no duplicate category slug", () => {
    const slugs = ALL.map((area) => area.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has no duplicate service slug across BOTH audiences", () => {
    // Not per-category: a service slug is globally addressable, so a collision
    // between a business and an individual service makes one unreachable.
    const slugs = ALL_SERVICES.map((service) => service.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("resolves every related service, and never links a service to itself", () => {
    const known = new Set(ALL_SERVICES.map((service) => service.slug));
    const dangling: string[] = [];

    for (const service of ALL_SERVICES) {
      for (const related of service.relatedSlugs) {
        if (related === service.slug) dangling.push(`${service.slug} -> itself`);
        else if (!known.has(related)) dangling.push(`${service.slug} -> ${related}`);
      }
    }

    expect(dangling).toEqual([]);
  });

  it("numbers categories contiguously from 1 within each audience", () => {
    for (const audience of ["business", "individual"] as const) {
      const orders = listPracticeAreas(audience).map((area) => area.order);
      expect(orders).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("gives every service four key features and three FAQs", () => {
    for (const service of ALL_SERVICES) {
      expect(service.keyFeatures, service.slug).toHaveLength(4);
      expect(service.faqs, service.slug).toHaveLength(3);
    }
  });

  it("keeps every SEO title within what a search engine will show", () => {
    for (const entry of [...ALL, ...ALL_SERVICES]) {
      expect(entry.seo.title.length, entry.slug).toBeLessThanOrEqual(60);
    }
  });

  it("scopes every service to at least one jurisdiction", () => {
    for (const service of ALL_SERVICES) {
      expect(service.jurisdictions.length, service.slug).toBeGreaterThan(0);
    }
  });

  it("carries no stray markdown out of the generator", () => {
    // The content is parsed from markdown, so a parser slip shows up as "**"
    // or a leading "- " embedded in prose rather than as a schema failure.
    const offenders: string[] = [];
    for (const service of ALL_SERVICES) {
      const texts = [
        service.name,
        service.summary,
        service.description,
        service.cta,
        ...service.keyFeatures,
        ...service.faqs.flatMap((faq) => [faq.question, faq.answer]),
      ];
      for (const text of texts) {
        if (text.includes("**") || text.startsWith("- ")) offenders.push(text.slice(0, 60));
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("lookups", () => {
  it("maps audiences to URL segments in both directions", () => {
    expect(AUDIENCE_SEGMENT.individual).toBe("individuals");
    expect(audienceFromSegment("individuals")).toBe("individual");
    expect(audienceFromSegment("business")).toBe("business");
    expect(audienceFromSegment("nonsense")).toBeUndefined();
  });

  it("finds a category only within its own audience", () => {
    const area = listPracticeAreas("business")[0];
    expect(findPracticeArea("business", area.slug)).toBe(area);
    expect(findPracticeArea("individual", area.slug)).toBeUndefined();
  });

  it("finds a service by slug alone and returns the category with it", () => {
    const area = listPracticeAreas("individual")[0];
    const service = area.services[0];

    const found = findService(service.slug);
    expect(found?.service).toBe(service);
    expect(found?.area).toBe(area);
  });

  it("returns undefined for an unknown service slug", () => {
    // /contact?service= carries a slug from the query string. It is untrusted,
    // so the miss has to be a clean undefined rather than a throw.
    expect(findService("not-a-real-service")).toBeUndefined();
  });

  it("builds paths nobody has to assemble by hand", () => {
    const area = listPracticeAreas("individual")[0];
    expect(practiceAreaPath(area)).toBe(`/individuals/${area.slug}`);
    expect(servicePath(area, area.services[0])).toBe(
      `/individuals/${area.slug}/${area.services[0].slug}`,
    );
  });
});

describe("route enumeration", () => {
  it("emits one route per service and per category", () => {
    expect(allServiceRoutes()).toHaveLength(48);
    expect(allCategoryRoutes()).toHaveLength(12);
  });

  it("uses the URL segment, not the audience name, in routes", () => {
    const individual = allServiceRoutes().filter((route) => route.audience === "individual");
    expect(individual.length).toBe(24);
    expect(individual.every((route) => route.segment === "individuals")).toBe(true);
  });

  it("produces routes that all resolve back to real content", () => {
    // This is what stops the sitemap advertising URLs that 404: both it and
    // generateStaticParams read from here.
    for (const route of allServiceRoutes()) {
      const found = findService(route.service);
      expect(found, route.service).toBeDefined();
      expect(found?.area.slug).toBe(route.category);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Proving the invariants fire.
 *
 * index.ts runs its checks at module load, so they cannot be re-run
 * against bad data. These re-implement each check over a fixture and
 * assert it rejects - if one of these ever passes silently, the
 * corresponding guard in index.ts has stopped meaning anything.
 * ------------------------------------------------------------------ */

function area(overrides: Partial<PracticeArea> = {}): PracticeArea {
  const service = (slug: string, related: string[] = []) => ({
    slug,
    name: "A Service",
    summary: "A summary that stands on its own in a grid of cards.",
    description: "A description.",
    keyFeatures: ["One", "Two", "Three", "Four"],
    jurisdictions: ["CA" as const],
    faqs: [
      { question: "Q one?", answer: "A one." },
      { question: "Q two?", answer: "A two." },
    ],
    relatedSlugs: related,
    cta: "Do the thing",
    icon: "scale",
    seo: { title: "A Service", description: "x".repeat(60) },
  });

  return practiceAreaSchema.parse({
    slug: "a-category",
    audience: "business",
    name: "A Category",
    tagline: "A tagline.",
    overview: "An overview.",
    icon: "scale",
    order: 1,
    seo: { title: "A Category", description: "x".repeat(60) },
    services: [service("one"), service("two"), service("three"), service("four")],
    ...overrides,
  });
}

const dupes = (values: string[]) => values.filter((v, i) => values.indexOf(v) !== i);

describe("the invariants reject broken content", () => {
  it("catches a duplicate category slug", () => {
    const areas = [area(), area({ order: 2 })];
    expect(dupes(areas.map((a) => a.slug))).toEqual(["a-category"]);
  });

  it("catches a duplicate service slug across audiences", () => {
    const business = area();
    const individual = area({ slug: "another-category", audience: "individual" });
    const slugs = [...business.services, ...individual.services].map((s) => s.slug);

    // Same four slugs on both sides - invisible if you only check within a category.
    expect(dupes(slugs).sort()).toEqual(["four", "one", "three", "two"]);
  });

  it("catches a related slug that points at nothing", () => {
    const broken = area({
      services: area().services.map((s, i) =>
        i === 0 ? { ...s, relatedSlugs: ["does-not-exist"] } : s,
      ),
    });
    const known = new Set(broken.services.map((s) => s.slug));

    expect(broken.services[0].relatedSlugs.filter((r) => !known.has(r))).toEqual([
      "does-not-exist",
    ]);
  });

  it("catches a non-contiguous category order", () => {
    const orders = [1, 2, 4].sort((a, b) => a - b);
    const expected = orders.map((_, i) => i + 1);
    expect(orders.join(",")).not.toBe(expected.join(","));
  });

  it("rejects a service with the wrong number of key features at the schema level", () => {
    const three = { ...area().services[0], keyFeatures: ["One", "Two", "Three"] };
    expect(() =>
      practiceAreasSchema.parse([{ ...area(), services: [three, three, three, three] }]),
    ).toThrow();
  });

  it("rejects a non-kebab-case slug and an over-long SEO title", () => {
    expect(() => practiceAreaSchema.parse({ ...area(), slug: "Not Kebab Case" })).toThrow();
    expect(() =>
      practiceAreaSchema.parse({
        ...area(),
        seo: { title: "x".repeat(61), description: "x".repeat(60) },
      }),
    ).toThrow();
  });
});
