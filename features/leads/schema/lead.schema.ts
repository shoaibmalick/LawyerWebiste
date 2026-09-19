import { z } from "zod";
import { AUDIENCES, JURISDICTIONS } from "@/config/schema/practice-area.schema";
import { honeypotField } from "@/lib/honeypot";
import { optionalPhoneSchema } from "@/lib/phone";

/**
 * A slug arriving from a form or a query string.
 *
 * Shape-checked here and **existence-checked in submit-lead.ts**, against the
 * real content. This regex only proves the value could not be anything but a
 * slug - it cannot prove the slug names a service that exists, because a schema
 * has no way to see the content module.
 *
 * Both halves matter. Without the regex, an arbitrary string reaches the
 * database and the notification email; without the lookup, a well-formed slug
 * for a service that was renamed last month is filed against nothing and the
 * dashboard shows a practice area the firm does not have.
 */
const slugSchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lowercase kebab-case");

/**
 * An unselected `<select>` submits `""`, not `undefined`.
 *
 * This is the difference between a field being optional and a field being
 * absent, and `.optional()` only covers the second. A bare
 * `slugSchema.optional()` therefore **rejected** the default "I'm not sure yet"
 * option, because `""` is present and fails the kebab-case regex.
 *
 * The failure was silent and total. These fields have no error message of their
 * own - there is nothing useful to say about an optional dropdown - so
 * react-hook-form blocked the submit, rendered no error, and the button simply
 * did nothing. Anyone who left both dropdowns alone could not send the form at
 * all, which is to say the default path was the broken one.
 *
 * Normalising here rather than in the component: the API accepts this shape
 * from anywhere, and a browser is not the only thing that can post an empty
 * string.
 */
function optionalField<T extends z.ZodTypeAny>(schema: T) {
  // A union rather than `z.preprocess`: preprocess widens the inferred input to
  // `unknown`, which propagates into `CreateLeadInput` and breaks the typing
  // react-hook-form relies on to check the form against the schema.
  return schema.optional().or(z.literal("").transform(() => undefined));
}

export const createLeadSchema = z
  .object({
    name: z.string().min(1).max(200),
    email: z.email(),
    // One format everywhere the public types a number — see lib/phone.ts.
    phone: optionalPhoneSchema,
    message: z.string().min(1).max(2000),

    /*
     * Routing context, all optional.
     *
     * Optional because the form is reachable from /contact with nothing
     * selected, and because a visitor who does not know which practice area
     * their problem belongs to is exactly the visitor most in need of writing
     * in. Requiring a category would turn the easiest path to the firm into a
     * quiz about legal taxonomy.
     *
     * They are not decorative: a lead that arrives already tagged with the
     * service page it came from lands in the right lawyer's queue without
     * anyone reading it first, which is the whole point of having 48 pages.
     */
    audience: optionalField(z.enum(AUDIENCES)),
    practiceAreaSlug: optionalField(slugSchema),
    serviceSlug: optionalField(slugSchema),
    /** "BOTH" is a real answer here, and the commonest one for this firm. */
    jurisdiction: optionalField(z.enum([...JURISDICTIONS, "BOTH"])),

    // Invisible spam trap — accepted, never stored. See lib/honeypot.ts.
    ...honeypotField,
  })
  .strict();

/**
 * Two types, because the schema transforms.
 *
 * `optionalField` turns `""` into `undefined`, so what a form submits and what
 * the API receives are genuinely different shapes. `z.infer` is the *output*,
 * and typing the form with it would say an unselected dropdown is impossible —
 * which is exactly the assumption that broke the form in the first place.
 */
export type CreateLeadInput = z.output<typeof createLeadSchema>;

/** What the form holds before validation: the selects may still be `""`. */
export type CreateLeadFormValues = z.input<typeof createLeadSchema>;
