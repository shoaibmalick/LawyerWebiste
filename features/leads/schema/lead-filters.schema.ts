import { z } from "zod";
import { LeadStatus } from "@/generated/prisma/enums";
import { listAllPracticeAreas } from "@/config/content/practice-areas";
import type { LeadFilters } from "@/server/services/leadService";

export const leadStatusSchema = z.enum(LeadStatus);

const KNOWN_PRACTICE_AREAS = new Set(listAllPracticeAreas().map((area) => area.slug));

export const leadIdSchema = z.object({ leadId: z.string().min(1) }).strict();

/**
 * Long enough for any real name or email address, short enough that a giant
 * query string cannot be pushed into an ILIKE pattern. The route is behind
 * admin auth, so this is a guard against accident more than attack.
 */
const MAX_TERM = 200;

function term(raw: string | string[] | undefined): string | undefined {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!value || value.length > MAX_TERM) return undefined;
  return value;
}

/**
 * Turn the URL's query string into filters the service understands.
 *
 * Everything is forgiving on purpose: a blank box submits as `?name=` and must
 * mean "no filter" rather than "match the empty string", and an unrecognised
 * status is dropped instead of 404ing. The URL is user-editable, and the worst
 * outcome of guessing wrong is showing more rows than intended — never fewer,
 * which would look like data loss.
 */
export function parseLeadFilters(
  params: Record<string, string | string[] | undefined>,
): LeadFilters {
  const filters: LeadFilters = {};

  const status = (Array.isArray(params.status) ? params.status[0] : params.status)
    ?.trim()
    .toUpperCase();
  const parsedStatus = status ? leadStatusSchema.safeParse(status) : undefined;
  if (parsedStatus?.success) filters.status = parsedStatus.data;

  const name = term(params.name);
  if (name) filters.name = name;

  const email = term(params.email);
  if (email) filters.email = email;

  const phone = term(params.phone);
  if (phone) filters.phone = phone;

  /*
   * Checked against the real content, not just accepted as a string.
   *
   * The query string is user-editable. An unrecognised slug is dropped rather
   * than passed through to an equality filter, because a filter on a category
   * that does not exist returns zero rows — which reads as "no leads" rather
   * than "bad filter", and looks exactly like data loss.
   */
  const practiceArea = term(params.practiceArea);
  if (practiceArea && KNOWN_PRACTICE_AREAS.has(practiceArea)) {
    filters.practiceAreaSlug = practiceArea;
  }

  const audience = term(params.audience);
  if (audience === "business" || audience === "individual") filters.audience = audience;

  return filters;
}

/** Whether anything is actually being filtered, for the page's copy. */
export function hasLeadFilters(filters: LeadFilters): boolean {
  return Object.keys(filters).length > 0;
}
