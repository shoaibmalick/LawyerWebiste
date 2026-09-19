import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site.config";
import { isCurrentSection } from "@/lib/nav";

describe("isCurrentSection", () => {
  it("matches the section's own page", () => {
    expect(isCurrentSection("/business", "/business")).toBe(true);
  });

  it("matches a page nested inside it", () => {
    // The case that matters: 48 of the site's 76 routes are this deep, and an
    // exact match would leave the nav blank on every one of them.
    expect(
      isCurrentSection("/business/intellectual-property/patent-drafting-prosecution", "/business"),
    ).toBe(true);
    expect(isCurrentSection("/attorneys/aisha-rahman", "/attorneys")).toBe(true);
  });

  it("does not match a sibling that merely shares a prefix", () => {
    expect(isCurrentSection("/business-development", "/business")).toBe(false);
    expect(isCurrentSection("/individualsomething", "/individuals")).toBe(false);
  });

  it("never matches the root, which is a prefix of everything", () => {
    expect(isCurrentSection("/", "/")).toBe(false);
    expect(isCurrentSection("/contact", "/")).toBe(false);
  });

  it("ignores hrefs that are not site paths", () => {
    expect(isCurrentSection("/contact", "#booking")).toBe(false);
    expect(isCurrentSection("/contact", "https://example.com/contact")).toBe(false);
  });

  it("marks exactly one entry of the real nav on any given route", () => {
    // Guards against a config change introducing overlapping entries — two
    // highlighted items say less than none, and nothing else would catch it.
    const routes = [
      "/business",
      "/business/intellectual-property/patent-drafting-prosecution",
      "/individuals/criminal-defence",
      "/attorneys",
      "/attorneys/helen-osei",
      "/about",
      "/contact",
    ];

    for (const route of routes) {
      const marked = siteConfig.nav.filter((item) => isCurrentSection(route, item.href));
      expect(marked, `${route} marked ${marked.map((m) => m.label).join(", ")}`).toHaveLength(1);
    }
  });

  it("marks nothing on routes the nav does not cover", () => {
    // The homepage and the booking flow are reachable from the header's button
    // and its logo, neither of which is a nav entry. Nothing lit is correct.
    for (const route of ["/", "/consultation", "/credits", "/legal/privacy"]) {
      expect(siteConfig.nav.filter((item) => isCurrentSection(route, item.href))).toHaveLength(0);
    }
  });
});
