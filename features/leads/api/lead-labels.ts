import { findPracticeArea, findService } from "@/config/content/practice-areas";
import type { Audience } from "@/config/schema/practice-area.schema";

/**
 * Slugs back into names, for whoever is triaging the queue.
 *
 * Resolved at read time rather than denormalised onto the row. The stored slug
 * is a record of what the visitor picked at the time; the display name is
 * whatever the content calls it today, and those are allowed to diverge - a
 * category renamed last month should show its new name on an old lead, not
 * freeze the old one.
 *
 * Lives here rather than inline in the page because it has three branches and
 * a fallback, and a page file is not somewhere a reader looks for logic worth
 * testing.
 */

export type LeadContext = {
  audience: string | null;
  practiceAreaSlug: string | null;
  serviceSlug: string | null;
};

export const JURISDICTION_LABELS: Record<string, string> = {
  CA: "Canada",
  US: "United States",
  BOTH: "Canada + US",
};

export function practiceAreaLabel(lead: LeadContext): string | null {
  if (lead.serviceSlug) {
    const found = findService(lead.serviceSlug);
    if (found) return `${found.area.name} — ${found.service.name}`;
  }

  if (lead.practiceAreaSlug) {
    const audience = lead.audience as Audience | null;
    const area = audience ? findPracticeArea(audience, lead.practiceAreaSlug) : undefined;
    /*
     * Falls back to the raw slug rather than to null.
     *
     * A slug that no longer resolves means the content was renamed after this
     * lead arrived. "criminal-defence" is ugly in a dashboard; a blank field on
     * a lead that definitely had a practice area is worse, because it reads as
     * "the visitor did not say" - which is a different fact, and the one the
     * person triaging would act on.
     */
    return area?.name ?? lead.practiceAreaSlug;
  }

  return null;
}

export function jurisdictionLabel(jurisdiction: string | null): string | null {
  if (!jurisdiction) return null;
  // Unknown values fall through to the raw string for the same reason as above.
  return JURISDICTION_LABELS[jurisdiction] ?? jurisdiction;
}
