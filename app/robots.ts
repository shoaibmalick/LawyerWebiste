import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/**
 * This demo is deliberately un-indexable.
 *
 * Harbourline Law Group LLP does not exist. A fictional firm with a fictional
 * address, ranking for real legal queries, would put someone with an actual
 * legal problem in front of an office that cannot help them — and legal queries
 * are exactly the ones where that matters. So the whole site is disallowed, not
 * just the private areas.
 *
 * This is the same judgement `lib/placeholder-guard.ts` encodes for structured
 * data, applied to crawling. Both are demo safeguards; see specification.md 1.3
 * before removing either. When this becomes a real firm's site, the rule below
 * reverts to `allow: "/"` with the private-area disallow list, in the same
 * commit that replaces the invented business facts.
 *
 * `noindex` is not a security measure — `proxy.ts` is.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    // Still emitted. The sitemap is how the route inventory is verified during
    // development, and a disallowed site is not crawled for it anyway.
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
