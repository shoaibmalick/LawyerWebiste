import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PROVISIONAL_BUSINESS_FACTS, siteConfig } from "@/config/site.config";
import { PlaceholderInProductionError } from "@/lib/placeholder-guard";
import { buildLocalBusinessSchema } from "@/lib/structured-data";

/**
 * The demo safeguard, held in place by a test.
 *
 * Harbourline Law Group LLP does not exist. Its address, telephone number and
 * email are invented, and they render inside the homepage's `Attorney` JSON-LD —
 * which is to say, a public deploy would publish a law firm that is not there to
 * search engines, for queries made by people with real legal problems.
 *
 * `lib/placeholder-guard.ts` cannot catch this on its own: it detects blank
 * values and the REPLACE_WITH sentinel, and a plausible invention is neither.
 * `PROVISIONAL_BUSINESS_FACTS` is what closes that gap, and this test is what
 * stops the list being quietly emptied later.
 *
 * `NODE_ENV` is assigned rather than swapped through `vi.stubEnv` because
 * `isPublicDeploy()` reads `process.env` at call time, and the cast is the
 * narrowest way to write a readonly-typed env var back.
 */

const PUBLIC_URL = "https://harbourline.example";

describe("demo safeguards", () => {
  let originalNodeEnv: string | undefined;
  let originalSiteUrl: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  function asPublicProductionDeploy(siteUrl = PUBLIC_URL) {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = siteUrl;
  }

  it("refuses to build the firm's JSON-LD on a public production deploy", () => {
    asPublicProductionDeploy();

    expect(() =>
      buildLocalBusinessSchema(siteConfig, PUBLIC_URL, PROVISIONAL_BUSINESS_FACTS),
    ).toThrow(PlaceholderInProductionError);
  });

  it("names the offending fields, so the fix is a minute rather than a hunt", () => {
    asPublicProductionDeploy();

    let message = "";
    try {
      buildLocalBusinessSchema(siteConfig, PUBLIC_URL, PROVISIONAL_BUSINESS_FACTS);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("business.phone");
    expect(message).toContain("business.address.street");
    expect(message).toContain("config/site.config.ts");
  });

  it("is the provisional list doing the work, not a coincidence", () => {
    // Without the list the same config passes — which is exactly why the list
    // has to exist. If this ever starts throwing, the guard has grown a second
    // mechanism and the one above is no longer proving anything.
    asPublicProductionDeploy();

    expect(() => buildLocalBusinessSchema(siteConfig, PUBLIC_URL)).not.toThrow();
  });

  it("still builds on a localhost production build, so CI stays green", () => {
    // `npm run build` runs with NODE_ENV=production in CI and locally. A guard
    // that blocked those would be deleted within the week.
    asPublicProductionDeploy("http://localhost:3000");

    expect(() =>
      buildLocalBusinessSchema(siteConfig, "http://localhost:3000", PROVISIONAL_BUSINESS_FACTS),
    ).not.toThrow();
  });

  it("lists every invented business fact that reaches the JSON-LD", () => {
    // A field added to site.config.ts and forgotten here is the failure mode
    // this catches: it would publish silently.
    expect(PROVISIONAL_BUSINESS_FACTS).toContain(siteConfig.business.name);
    expect(PROVISIONAL_BUSINESS_FACTS).toContain(siteConfig.business.phone);
    expect(PROVISIONAL_BUSINESS_FACTS).toContain(siteConfig.business.email);
    expect(PROVISIONAL_BUSINESS_FACTS).toContain(siteConfig.business.address.street);
    expect(PROVISIONAL_BUSINESS_FACTS).toContain(siteConfig.business.address.zip);
  });

  it("keeps the firm out of search results entirely", async () => {
    const robots = (await import("@/app/robots")).default();

    expect(robots.rules).toMatchObject({ userAgent: "*", disallow: "/" });
    // An `allow` alongside a blanket disallow is how this gets undone by
    // accident — the more specific rule wins for crawlers that honour it.
    expect(robots.rules).not.toHaveProperty("allow");
  });
});
