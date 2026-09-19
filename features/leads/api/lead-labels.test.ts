import { describe, expect, it } from "vitest";
import { listPracticeAreas } from "@/config/content/practice-areas";
import { jurisdictionLabel, practiceAreaLabel } from "./lead-labels";

/**
 * What the person triaging the lead queue actually sees.
 *
 * Tested because the fallbacks carry meaning that is easy to get backwards: a
 * blank practice area means "the visitor did not say", and a stale slug means
 * "the content was renamed". Rendering the second as the first would send
 * somebody looking for information the lead already contains.
 */

const area = listPracticeAreas("individual")[0];
const service = area.services[0];

describe("practiceAreaLabel", () => {
  it("names the category and the service when a service is known", () => {
    expect(
      practiceAreaLabel({
        audience: "individual",
        practiceAreaSlug: area.slug,
        serviceSlug: service.slug,
      }),
    ).toBe(`${area.name} — ${service.name}`);
  });

  it("names just the category when no service was chosen", () => {
    expect(
      practiceAreaLabel({
        audience: "individual",
        practiceAreaSlug: area.slug,
        serviceSlug: null,
      }),
    ).toBe(area.name);
  });

  it("returns null when the visitor said nothing", () => {
    // Distinct from the stale-slug case below, and the distinction is the point.
    expect(
      practiceAreaLabel({ audience: null, practiceAreaSlug: null, serviceSlug: null }),
    ).toBeNull();
  });

  it("falls back to the raw slug when the content was renamed", () => {
    // Not null: this lead *did* carry a practice area, and showing nothing
    // would misreport it as one that did not.
    expect(
      practiceAreaLabel({
        audience: "individual",
        practiceAreaSlug: "a-category-that-was-renamed",
        serviceSlug: null,
      }),
    ).toBe("a-category-that-was-renamed");
  });

  it("ignores a service slug that no longer resolves and uses the category", () => {
    expect(
      practiceAreaLabel({
        audience: "individual",
        practiceAreaSlug: area.slug,
        serviceSlug: "gone-away",
      }),
    ).toBe(area.name);
  });

  it("does not resolve a category against the wrong audience", () => {
    // An individual category filed as business is a pair that cannot exist;
    // it should degrade to the raw slug rather than silently name the category.
    expect(
      practiceAreaLabel({
        audience: "business",
        practiceAreaSlug: area.slug,
        serviceSlug: null,
      }),
    ).toBe(area.slug);
  });
});

describe("jurisdictionLabel", () => {
  it("expands the stored codes", () => {
    expect(jurisdictionLabel("CA")).toBe("Canada");
    expect(jurisdictionLabel("US")).toBe("United States");
    expect(jurisdictionLabel("BOTH")).toBe("Canada + US");
  });

  it("returns null when unset", () => {
    expect(jurisdictionLabel(null)).toBeNull();
  });

  it("passes through an unrecognised code rather than hiding it", () => {
    expect(jurisdictionLabel("MX")).toBe("MX");
  });
});
