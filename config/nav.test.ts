import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allCategoryRoutes,
  allServiceRoutes,
  AUDIENCE_SEGMENT,
} from "@/config/content/practice-areas";
import { siteConfig } from "@/config/site.config";

/**
 * Every link in the header and footer resolves to a route that exists.
 *
 * Written because it didn't. `/attorneys` sat in `siteConfig.nav` through a
 * whole phase, rendered in the header on every page, and 404'd - the page it
 * points at is not built until Phase 7. Nothing failed: the config parsed, the
 * header rendered, the build passed, and the only way to notice was to click it.
 *
 * `site-header.tsx` renders `siteConfig.nav` verbatim, which is the property
 * that makes the config meaningful and also the property that turns a typo into
 * a dead link on sixty pages at once.
 *
 * Route existence is checked against the filesystem rather than by fetching,
 * so this needs no server and runs in the unit suite. A static route is a
 * directory under app/ with a page.tsx; the practice-area routes are dynamic,
 * so those are checked against the enumerated content instead.
 */

const APP_DIR = join(process.cwd(), "app");

/** Paths the practice-area content generates, which have no directory of their own. */
const CONTENT_ROUTES = new Set<string>([
  ...Object.values(AUDIENCE_SEGMENT).map((segment) => `/${segment}`),
  ...allCategoryRoutes().map((route) => `/${route.segment}/${route.category}`),
  ...allServiceRoutes().map((route) => `/${route.segment}/${route.category}/${route.service}`),
]);

/** Routes served by a dynamic segment whose params are a fixed, known list. */
const ENUMERATED_ROUTES = new Set<string>(["/legal/disclaimer", "/legal/privacy", "/legal/terms"]);

function routeExists(path: string): boolean {
  if (path === "/") return existsSync(join(APP_DIR, "page.tsx"));
  if (CONTENT_ROUTES.has(path) || ENUMERATED_ROUTES.has(path)) return true;

  // A static route: app/<segments>/page.tsx
  const segments = path.replace(/^\//, "").split("/");
  return existsSync(join(APP_DIR, ...segments, "page.tsx"));
}

/** Mirrors the LEGAL_LINKS list in components/blocks/site-footer.tsx. */
const FOOTER_LEGAL = ["/legal/disclaimer", "/legal/privacy", "/legal/terms"];

describe("site navigation", () => {
  it("points every header nav item at a route that exists", () => {
    const dead = siteConfig.nav
      .map((item) => item.href)
      // In-page anchors are rewritten to /#anchor by the header and always land
      // on the homepage, so there is no separate route to check.
      .filter((href) => !href.startsWith("#") && !href.startsWith("/#"))
      .filter((href) => !routeExists(href));

    expect(dead).toEqual([]);
  });

  it("points the header CTA at a route that exists, in both feature states", () => {
    /*
     * The CTA is resolved in app/layout.tsx and is not part of `siteConfig.nav`,
     * so the checks above never saw it. It shipped pointing at `#booking` and
     * `#contact` — kit defaults from when the whole site was one page. `#contact`
     * became a link to nothing the moment the "Visit us" band moved into the
     * footer, and an anchor to a missing id scrolls nowhere and reports nothing.
     *
     * Asserted as literals rather than by importing the layout: pulling a root
     * layout into a unit test drags next/font and the whole provider tree with
     * it. If these two strings change, this test should be updated in the same
     * commit — that is the point of it.
     */
    for (const href of ["/consultation", "/contact"]) {
      expect(routeExists(href), href).toBe(true);
    }
  });

  it("points the homepage's service cards at a route that exists", () => {
    /*
     * `ServicesGrid` builds each card's href from its `bookingHref` prop, so
     * the destination is not in `siteConfig.nav` either and the checks above
     * never saw it. It shipped with the block's default, `/?service=<slug>#booking`
     * — the kit's shape, from when the booking form was on the homepage. Once
     * `Booking` moved to /consultation that anchor matched nothing on the site,
     * and a missing anchor target scrolls nowhere and reports nothing, so every
     * tile quietly reloaded the homepage instead. Exactly the failure the CTA
     * test above was written for, one block further out.
     *
     * The literal is `app/page.tsx`'s, asserted here for the same reason and on
     * the same terms: change that string and change this line in the same
     * commit. `lib/services.test.ts` covers the href's shape; this covers the
     * only part of it a filesystem can answer — that the page is really there.
     */
    expect(routeExists("/consultation"), "ServicesGrid bookingHref").toBe(true);
  });

  it("points every footer legal link at a route that exists", () => {
    expect(FOOTER_LEGAL.filter((href) => !routeExists(href))).toEqual([]);
  });

  it("leads with the two audiences, in that order", () => {
    // The whole site forks on this choice. A visitor who cannot tell within one
    // glance which half is theirs has already been lost.
    const hrefs = siteConfig.nav.map((item) => item.href);
    expect(hrefs[0]).toBe("/business");
    expect(hrefs[1]).toBe("/individuals");
  });

  it("uses only absolute in-site paths, never relative ones", () => {
    // A relative href in a config rendered on sixty pages at three different
    // depths resolves to a different URL on each of them.
    for (const item of siteConfig.nav) {
      expect(item.href.startsWith("/") || item.href.startsWith("#"), item.href).toBe(true);
    }
  });

  it("proves the check can fail", () => {
    // Without this, a routeExists() that always returned true would leave every
    // assertion above passing and meaning nothing.
    //
    // The canary used to be "/attorneys", which was genuinely missing until
    // Phase 7 built it — and this test failed the moment it appeared, which is
    // the canary doing its job. Keep it pointed at something that will never be
    // a route rather than at whatever is unbuilt this week.
    expect(routeExists("/definitely-not-a-route")).toBe(false);
    expect(routeExists("/business/not-a-category")).toBe(false);
  });

  it("recognises the routes that do exist, including the dynamic ones", () => {
    // The other half of the same argument: a routeExists() that always returned
    // false would also leave every assertion above passing.
    expect(routeExists("/")).toBe(true);
    expect(routeExists("/attorneys")).toBe(true);
    expect(routeExists("/individuals")).toBe(true);
    expect(routeExists("/legal/disclaimer")).toBe(true);
  });
});
