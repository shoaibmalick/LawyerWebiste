import type { MetadataRoute } from "next";
import { AUDIENCE_SEGMENT } from "@/config/content/practice-areas";
import { visibleCategoryRoutes, visibleServiceRoutes } from "@/features/practice-areas";
import { listTeam } from "@/features/team";
import { siteUrl } from "@/lib/env";

/**
 * Every public route, enumerated from the same source the pages are built from.
 *
 * The visible-route helpers apply the firm's own visibility overrides, so a
 * category hidden in the CMS drops out of the sitemap in the same breath as it
 * starts 404ing. A sitemap advertising a URL that returns 404 is worse than one
 * missing an entry. Writing the list twice is the classic way a sitemap ends up full
 * of 404s: somebody renames a category, fixes the page, and never thinks about
 * the XML.
 *
 * Note this site is `Disallow: /` in robots.txt - see app/robots.ts. The sitemap
 * is emitted anyway because it is how the route inventory gets checked during
 * development, and a disallowed site is not crawled for it regardless.
 */

const STANDALONE = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/attorneys", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
  { path: "/consultation", priority: 0.8, changeFrequency: "monthly" },
  { path: "/legal/disclaimer", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
] as const satisfies readonly {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const standalone = STANDALONE.map((entry) => ({
    url: `${siteUrl}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  // The two audience hubs. Higher priority than a category, lower than home:
  // they are where a visitor who does not know what they need starts.
  const hubs = Object.values(AUDIENCE_SEGMENT).map((segment) => ({
    url: `${siteUrl}/${segment}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const categories = (await visibleCategoryRoutes()).map((route) => ({
    url: `${siteUrl}/${AUDIENCE_SEGMENT[route.audience]}/${route.category}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // The service pages are the point of the site - they are what someone
  // searching a specific legal problem should land on.
  const servicePages = (await visibleServiceRoutes()).map((route) => ({
    url: `${siteUrl}/${AUDIENCE_SEGMENT[route.audience]}/${route.category}/${route.service}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  /*
   * Attorney pages come from the database, so they are enumerated at request
   * time like everything else here. A lawyer added at /dashboard/settings is in
   * the sitemap on the next fetch rather than the next deploy.
   */
  const attorneys = (await listTeam()).map((attorney) => ({
    url: `${siteUrl}/attorneys/${attorney.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...standalone, ...hubs, ...categories, ...servicePages, ...attorneys];
}
