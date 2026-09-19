import { z } from "zod";

/**
 * Canned messages the dashboard offers when a member of staff emails a customer
 * or an enquirer.
 *
 * ## Why these are config and not a table
 *
 * CLAUDE.md's test for a new table is "who owns the decision", and this one
 * leans toward the owner — so the reasoning needs its second half. The body is
 * **fully editable at send time**: a template only pre-fills the compose box,
 * and whatever is typed over the top is what goes out. The harm that makes
 * something a table — the owner blocked behind a redeploy — therefore never
 * happens. What a table would cost is the check below: a stored template naming
 * `{{appointment_date}}` when the code knows `{{appointment_time}}` breaks
 * silently, in a customer's inbox, with no build to catch it.
 *
 * If a client does ask to edit these themselves, the upgrade path is the one
 * TeamMember already took: an `EmailTemplate` table seeded from this file the
 * first time a repo has no rows. Do not pre-build it.
 */

/**
 * Every placeholder a template may use. Adding one means adding it here and
 * supplying it in `features/admin-email/api/get-compose-context.ts` — the
 * `superRefine` below is what makes forgetting the second half a build error
 * rather than an empty gap in a customer's email.
 */
export const PLACEHOLDERS = [
  "customer_name",
  "business_name",
  "business_phone",
  "service_name",
  "appointment_time",
] as const;

export type Placeholder = (typeof PLACEHOLDERS)[number];

/**
 * Placeholders only a booking can fill. A lead is a contact-form enquiry — no
 * service, no appointment — so a template offering both would render "your
 * appointment on " with nothing after it.
 */
const BOOKING_ONLY: readonly Placeholder[] = ["service_name", "appointment_time"];

/** `{{ token }}`, with optional inner whitespace. */
const PLACEHOLDER_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/g;

function placeholdersIn(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]!);
}

const emailTemplateSchema = z
  .object({
    /** Stable identifier, recorded on the sent message for reporting. */
    key: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, "A template key is lower-case letters, digits and hyphens."),
    /** What the dropdown shows. */
    label: z.string().min(1).max(80),
    /** Which kinds of record this template makes sense for. */
    appliesTo: z.array(z.enum(["booking", "lead"])).min(1),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
  })
  .strict()
  .superRefine((template, ctx) => {
    const used = [...placeholdersIn(template.subject), ...placeholdersIn(template.body)];

    for (const name of used) {
      if (!PLACEHOLDERS.includes(name as Placeholder)) {
        ctx.addIssue({
          code: "custom",
          path: ["body"],
          message: `"${template.key}" uses {{${name}}}, which is not a placeholder this site can fill. Known placeholders: ${PLACEHOLDERS.join(", ")}.`,
        });
      }
    }

    if (template.appliesTo.includes("lead")) {
      for (const name of used) {
        if (BOOKING_ONLY.includes(name as Placeholder)) {
          ctx.addIssue({
            code: "custom",
            path: ["appliesTo"],
            message: `"${template.key}" applies to leads but uses {{${name}}}, which only a booking can fill. An enquiry has no appointment.`,
          });
        }
      }
    }
  });

export const emailTemplatesSchema = z
  .array(emailTemplateSchema)
  .max(20)
  .superRefine((templates, ctx) => {
    const seen = new Set<string>();
    for (const template of templates) {
      if (seen.has(template.key)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate template key "${template.key}".`,
        });
      }
      seen.add(template.key);
    }
  });

export type EmailTemplate = z.infer<typeof emailTemplateSchema>;
