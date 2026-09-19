import { z } from "zod";

/**
 * What an admin may change about a practice area. Zod first, types derived.
 *
 * Deliberately narrow. The editable surface is four presentation decisions and
 * two short strings; everything else about a practice area is content, and
 * content is edited in the markdown and regenerated. Widening this is how a
 * config-backed CMS quietly becomes a database-backed one with a config file
 * nobody trusts.
 */

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lowercase kebab-case");

export const practiceAreaKindSchema = z.enum(["CATEGORY", "SERVICE"]);
export type PracticeAreaKind = z.infer<typeof practiceAreaKindSchema>;

/**
 * An empty or whitespace-only override means "use the config copy".
 *
 * Normalised to `null` here rather than stored as "". Two representations of
 * unchanged would mean every read site has to remember to check for both, and
 * one of them eventually would not — rendering a blank summary on a live card.
 */
const overrideTextSchema = z
  .string()
  .max(220)
  .transform((value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .nullable();

export const updatePracticeAreaSchema = z
  .object({
    slug: slugSchema,
    kind: practiceAreaKindSchema,
    visible: z.boolean(),
    featured: z.boolean(),
    summaryOverride: overrideTextSchema,
    ctaOverride: overrideTextSchema.transform((value) =>
      // A CTA is a button label; 80 is already generous and the schema over in
      // practice-area.schema.ts caps the config side at the same number.
      value && value.length > 80 ? value.slice(0, 80) : value,
    ),
  })
  .strict();

export type UpdatePracticeAreaInput = z.infer<typeof updatePracticeAreaSchema>;

/**
 * A reorder is the whole list, not a single move.
 *
 * Sending "move X up" would need the server to reconstruct the list the admin
 * was looking at, and two tabs open at once would produce an order neither of
 * them asked for. The client sends the order it is showing; the server writes
 * exactly that.
 */
export const reorderPracticeAreasSchema = z
  .object({
    kind: practiceAreaKindSchema,
    slugs: z.array(slugSchema).min(1).max(100),
  })
  .strict();

export type ReorderPracticeAreasInput = z.infer<typeof reorderPracticeAreasSchema>;

export const resetPracticeAreaSchema = z.object({ slug: slugSchema }).strict();
