/**
 * Stopping placeholder business facts from reaching production.
 *
 * Spec 11 — and the reason it exists is not hypothetical. The sibling dental
 * repo carries a fictional phone number, an invented address and invented
 * opening hours, all of which render inside its `LocalBusiness` JSON-LD. It has
 * been code-complete for weeks in that state. Deploying it would publish a fake
 * business to search engines.
 *
 * The original rule was "make placeholders *look* like placeholders". That is
 * better than plausible invented content, but it relies on a human noticing
 * before deploy, and a human did not.
 *
 * So: **if a required business fact is missing, the application prevents it
 * from reaching production rather than rendering it oddly and hoping.**
 *
 * One module, one definition. The same reasoning the kit applies to
 * `CAPACITY_HOLDING_STATUSES`: the rule is one constant because spelling it out
 * at four call sites is how the fifth call site gets forgotten.
 */

/**
 * The sentinel prefix.
 *
 * Deliberately unmistakable, so the check can be **exact rather than
 * heuristic**. A heuristic for "looks fake" would both miss real placeholders
 * and reject real content — a restaurant on Placeholder Street is unlikely, but
 * a menu description mentioning the word is not, and a guard that cries wolf
 * gets switched off.
 */
export const PLACEHOLDER_PREFIX = "REPLACE_WITH";

/** Every field this repo expects to be filled in before launch. */
export const PLACEHOLDER_SENTINELS = [
  `${PLACEHOLDER_PREFIX}_VERIFIED_PHONE`,
  `${PLACEHOLDER_PREFIX}_VERIFIED_ADDRESS`,
  `${PLACEHOLDER_PREFIX}_VERIFIED_HOURS`,
  `${PLACEHOLDER_PREFIX}_REAL_MENU`,
  `${PLACEHOLDER_PREFIX}_APPROVED_HERO_IMAGE`,
  `${PLACEHOLDER_PREFIX}_VERIFIED_ACCOLADE`,
] as const;

export class PlaceholderInProductionError extends Error {
  constructor(fields: string[], source: string) {
    super(
      `Placeholder content cannot reach production.\n\n` +
        fields.map((field) => `  • ${field}`).join("\n") +
        `\n\nThese live in ${source}. Replace them with the restaurant's real details, ` +
        `or the site will publish them — including to search engines, through the ` +
        `Restaurant JSON-LD.\n\n` +
        `There is deliberately no flag to switch this off. See ` +
        `docs/spec/11-PLACEHOLDER-SAFETY.md.`,
    );
    this.name = "PlaceholderInProductionError";
  }
}

/**
 * Is this value missing, or still a placeholder?
 *
 * Absent counts. "The check is not 'is the string empty'" is the spec's wording
 * for the sentinel half — but a required field that is blank is just as unfit
 * to publish as one that still says REPLACE_WITH, and blank is the shape an
 * unset environment variable takes.
 *
 * `provisional` covers the case a sentinel structurally cannot. A sentinel is
 * only present where somebody was disciplined enough to leave one, and the
 * moment real content starts arriving that stops being true: an intake sheet
 * comes back with a street, a city and a postal code that are all invented,
 * none of which say REPLACE_WITH, because a person filling in a form writes
 * something that looks like an answer. Those values are indistinguishable from
 * real ones by inspection, so the caller — which knows which of its own values
 * are still unverified — names them instead.
 *
 * Still exact, still whole-value, and deliberately not a substring match: a
 * restaurant genuinely called Dream City Bistro must not be undeployable
 * because a placeholder city was once called Dream City.
 */
export function isPlaceholder(value: unknown, provisional: Iterable<string> = []): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.includes(PLACEHOLDER_PREFIX)) return true;

  for (const candidate of provisional) {
    if (candidate.trim() === trimmed) return true;
  }

  return false;
}

/**
 * Is this build going to be served to the public?
 *
 * `NODE_ENV === "production"` alone is not the question. CI runs a production
 * build on every push to prove the app compiles, and so does anyone checking
 * their work locally — failing those would make the repo permanently red while
 * content is still being gathered, and a guard that blocks all work is a guard
 * that gets deleted.
 *
 * Spec 11 supplies the discriminator itself: a staging deploy "runs with the
 * development behaviour and NEXT_PUBLIC_SITE_URL pointing at a noindex host".
 * So the question is where this build thinks it lives. A real public hostname
 * means real visitors and real search engines; localhost means somebody is
 * checking that it compiles.
 *
 * This is not the switch the spec forbids. There is no flag, and no environment
 * variable whose purpose is to disable the check — pointing a build at the
 * restaurant's own domain is exactly the act that turns it on.
 */
function isPublicDeploy(): boolean {
  if (process.env.NODE_ENV !== "production") return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // Unset counts as public: an unconfigured production deploy is the one most
  // likely to be a mistake, and failing loudly is the safe direction.
  if (siteUrl.trim().length === 0) return true;

  return !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i.test(siteUrl);
}

/**
 * Refuse to publish while any of these are still placeholders.
 *
 * Development, test and localhost builds render them visibly and carry on, so
 * the site stays buildable and reviewable while content is still arriving
 * (PL3). A public deploy throws, naming the field *and* the file (PL1) — "a
 * placeholder was found" sends someone hunting through a repo, and the
 * difference between a one-minute fix and a hunt is the difference between this
 * guard being respected and being commented out.
 *
 * Takes **resolved** values rather than reading config itself (PL4), so a
 * placeholder arriving from an environment variable in production is caught
 * exactly like a committed one. Nothing in this signature lets a caller hand it
 * the source file instead of what the app will actually render.
 *
 * `provisional` is optional, and omitting it behaves exactly as this function
 * always has — a client repo that has not adopted it is not silently given new
 * behaviour by a template merge. See `isPlaceholder` for what it is for; the
 * values themselves belong in the client's own config, never here, because they
 * are that one business's facts.
 */
export function assertNoPlaceholders(
  fields: Record<string, unknown>,
  source: string,
  provisional: Iterable<string> = [],
): void {
  if (!isPublicDeploy()) return;

  // Materialised once: `provisional` may be any iterable, and a generator would
  // be exhausted by the first field and silently pass every field after it.
  const unverified = [...provisional];

  const offending = Object.entries(fields)
    .filter(([, value]) => isPlaceholder(value, unverified))
    .map(([field]) => field);

  if (offending.length > 0) throw new PlaceholderInProductionError(offending, source);
}
