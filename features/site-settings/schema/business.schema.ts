import { z } from "zod";

import { businessHoursSchema } from "@/config/schema/site.schema";

/**
 * An optional text override.
 *
 * A blank box is not an empty value — it means "no override, use the
 * configured one". Trimming to undefined is what makes clearing a field a
 * supported way back to config rather than a way to publish an empty phone
 * number.
 */
const override = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    });

/**
 * What the dashboard may send for the business's contact details.
 *
 * Deliberately looser than `siteConfigSchema.business` in one place and
 * stricter in another:
 *
 * - **Every field is optional**, because null means "use config" and the form
 *   posts blanks for anything the business has not overridden.
 * - **Hours reuse `businessHoursSchema`** rather than a looser copy, so the
 *   dashboard cannot store a shape the site cannot render — the same `HH:MM`
 *   regex and day enum the config file has always enforced.
 *
 * The email is validated as an email when present. It is where booking and
 * lead notifications are sent, so a typo here silently stops the business
 * hearing about new customers — the most expensive failure on this form.
 */
export const saveBusinessSchema = z
  .object({
    phone: override(40),
    email: z
      .union([z.literal(""), z.email("That doesn't look like an email address")])
      .optional()
      .transform((value) => {
        const trimmed = value?.trim();
        return trimmed ? trimmed : undefined;
      }),
    addressStreet: override(200),
    addressCity: override(100),
    addressState: override(100),
    addressZip: override(20),
    addressCountry: override(100),
    /**
     * All seven days or none.
     *
     * A partial week would merge unpredictably against the configured one, and
     * the form always posts the full week anyway — a "Closed" day is
     * `{ opens: null, closes: null }`, not an omitted entry.
     */
    hours: z.array(businessHoursSchema).length(7).optional(),
  })
  .strict();

export type SaveBusinessInput = z.infer<typeof saveBusinessSchema>;
