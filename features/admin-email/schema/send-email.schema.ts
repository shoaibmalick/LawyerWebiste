import { z } from "zod";

/**
 * Which record a message belongs to. The discriminator does double duty: it is
 * how the recipient is looked up, and it is what the log row hangs off.
 */
export const emailSubjectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("booking"), bookingId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("lead"), leadId: z.string().min(1) }).strict(),
]);

export type EmailSubject = z.infer<typeof emailSubjectSchema>;

export const composeContextSchema = z.object({ subject: emailSubjectSchema }).strict();

/**
 * ## There is no `to` field, and that is the point
 *
 * The recipient is read from the booking or the lead on the server, after the
 * record is loaded. "Send to an address I typed" is not expressible in this
 * wire format at all, which is a stronger guarantee than validating one would
 * be:
 *
 * - An admin session stops being worth anything to a spammer. Without this, a
 *   stolen dashboard login is an open relay sending from a domain with the
 *   business's SPF and DKIM on it.
 * - The sending domain's reputation is the asset. docs/EMAIL_DOMAIN_SETUP.md
 *   is 200 lines about why a confirmation landing in spam means a customer
 *   turning up to a chair that was given away.
 * - Customer detail can only ever reach that customer.
 *
 * The cost, which is real: no forwarding a message to a colleague, a parent or
 * a translator. The compose panel says so rather than leaving someone hunting
 * for the field. If that is ever needed it becomes its own flow with its own
 * confirmation step, not a free text box on this one.
 *
 * ## There is no `note` field either
 *
 * An earlier draft let the panel write a BookingNote in the same call, the way
 * confirm and cancel do. It would have made this slice import
 * `@/features/booking` for the note schema while booking-list imports this
 * slice for the panel — a cycle between two feature barrels, which is worse
 * than the convenience is worth. It is also unnecessary: the sent message is
 * itself the record, and the call panel's own note field is still right there.
 */
export const sendAdminEmailSchema = z
  .object({
    subject: emailSubjectSchema,
    /** Recorded on the log row for reporting. Never re-applied at send time. */
    templateKey: z.string().min(1).max(64).optional(),
    subjectLine: z
      .string()
      .trim()
      .min(1, "Give the message a subject.")
      .max(200, "That subject is too long — keep it under 200 characters."),
    body: z
      .string()
      .trim()
      .min(1, "Write something to send.")
      .max(5000, "That message is too long — keep it under 5000 characters."),
  })
  .strict();

export type SendAdminEmailInput = z.infer<typeof sendAdminEmailSchema>;
