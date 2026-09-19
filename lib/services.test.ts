import { describe, expect, it } from "vitest";
import { bookingCardHref, groupServicesByCategory, slugifyCategory } from "./services";
import type { Service } from "@/config/schema/content.schema";

function service(slug: string, category?: string): Service {
  return { slug, name: slug, description: "A service.", durationMinutes: 30, category };
}

describe("groupServicesByCategory", () => {
  it("returns one group per category, in first-appearance order", () => {
    const groups = groupServicesByCategory([
      service("a", "Colour"),
      service("b", "Cutting"),
      service("c", "Colour"),
    ]);
    expect(groups.map((g) => g.category)).toEqual(["Colour", "Cutting"]);
  });

  it("preserves config order inside a group", () => {
    const groups = groupServicesByCategory([
      service("a", "Colour"),
      service("b", "Cutting"),
      service("c", "Colour"),
    ]);
    expect(groups[0].services.map((s) => s.slug)).toEqual(["a", "c"]);
  });

  it("puts uncategorised services in a trailing null group", () => {
    const groups = groupServicesByCategory([service("a"), service("b", "Colour")]);
    expect(groups.map((g) => g.category)).toEqual(["Colour", null]);
    expect(groups[1].services.map((s) => s.slug)).toEqual(["a"]);
  });

  it("returns a single null group when nothing is categorised", () => {
    const groups = groupServicesByCategory([service("a"), service("b")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBeNull();
  });

  it("returns no groups for an empty list", () => {
    expect(groupServicesByCategory([])).toEqual([]);
  });
});

describe("slugifyCategory", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyCategory("Highlights & Foils")).toBe("highlights-foils");
  });

  it("collapses runs of punctuation into one hyphen", () => {
    expect(slugifyCategory("Women's Cutting & Styling")).toBe("women-s-cutting-styling");
  });

  it("leaves no leading or trailing hyphen", () => {
    expect(slugifyCategory("& Colour &")).toBe("colour");
  });

  it("keeps accented letters out of the id", () => {
    expect(slugifyCategory("Ombré Brows")).toBe("ombr-brows");
  });
});

describe("bookingCardHref", () => {
  /*
   * Written after every consultation tile on the homepage linked to
   * `/?service=<slug>#booking` for a whole phase after `Booking` moved to
   * `/consultation`. The anchor resolved against a page that no longer carried
   * it, so each card loaded the homepage and stopped — silently, because a
   * missing anchor target is not an error anyone reports. See specification.md
   * 7.17; config/nav.test.ts pins the route the homepage actually passes.
   */

  it("carries both the query the form reads and the anchor that reaches it", () => {
    expect(bookingCardHref("/consultation", "initial-consultation")).toBe(
      "/consultation?service=initial-consultation#booking",
    );
  });

  it("keeps the single-page arrangement well-formed", () => {
    // The default. A naive join gives `//?service=` here, which is a
    // protocol-relative URL to the host named `?service=...`.
    expect(bookingCardHref("/", "initial-consultation")).toBe(
      "/?service=initial-consultation#booking",
    );
  });

  it("strips a trailing slash rather than emitting a redirect", () => {
    expect(bookingCardHref("/consultation/", "estate-plan-review")).toBe(
      "/consultation?service=estate-plan-review#booking",
    );
  });

  it("encodes the slug", () => {
    // Slugs are kebab-case today, so this guards the shape rather than a value
    // in config: the query is parsed by the browser before the form ever sees
    // it, and an unencoded `&` would split it into two parameters.
    expect(bookingCardHref("/consultation", "a&b c")).toBe(
      "/consultation?service=a%26b%20c#booking",
    );
  });

  it("puts the query before the fragment", () => {
    // The other order parses as a fragment containing a `?`, and
    // `useSearchParams()` returns nothing at all.
    const href = bookingCardHref("/consultation", "estate-plan-review");
    expect(href.indexOf("?")).toBeLessThan(href.indexOf("#"));
  });
});
