/**
 * Which top-level nav entry the reader is currently inside.
 *
 * In `lib/` rather than in the header, because it is the one part of that
 * component that is pure, has edge cases, and would otherwise be untestable
 * without mounting a client component and a router.
 */

/**
 * True when `pathname` is `href` or lives underneath it.
 *
 * **Prefix matching, not equality.** The nav has five entries and the site has
 * 76 routes, so exact matching leaves nothing marked on all but five of them —
 * including every one of the 48 service pages, which is exactly where a reader
 * is most likely to have lost track of which half of the firm they are reading
 * about.
 *
 * **On a segment boundary.** A bare `startsWith("/business")` also matches
 * `/business-development`, which is a different section of a site that does not
 * exist yet and would be a silently wrong highlight the day it did.
 *
 * **`"/"` never matches.** Every path begins with it, so the home entry would
 * be marked current on all 76 routes. Excluded here rather than special-cased
 * at the call site, so a config that adds `{ label: "Home", href: "/" }` cannot
 * reintroduce it.
 */
export function isCurrentSection(pathname: string, href: string): boolean {
  if (!href.startsWith("/") || href === "/") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
