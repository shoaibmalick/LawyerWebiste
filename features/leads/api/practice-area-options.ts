import { listAllPracticeAreas } from "@/config/content/practice-areas";
import type { PracticeAreaOption } from "../components/lead-form";

/**
 * The practice-area select's options, flattened for the form.
 *
 * Lives on the server side of the feature so the content module stays out of
 * the browser bundle: `LeadForm` is a client component, and importing the
 * content there would ship 48 services and 144 FAQs to render a dropdown of
 * twelve.
 *
 * Categories, not services. Forty-eight options in a select is a list nobody
 * reads to the end, and the distinction between two services in the same
 * category is rarely one the person writing in can make - that is what they are
 * writing in to find out. A visitor who *does* know lands here from a service
 * page, where the context is already resolved and the select is not shown.
 *
 * Module scope: derived from static config, identical for every request.
 */
export const PRACTICE_AREA_OPTIONS: PracticeAreaOption[] = listAllPracticeAreas().map((area) => ({
  value: area.slug,
  label: area.name,
  audience: area.audience,
}));
