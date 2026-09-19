import { z } from "zod";
import { SINGLE_ADDRESS } from "@/lib/email";

/**
 * What the settings form may change.
 *
 * Messages here are user-facing copy: the action surfaces the first issue
 * verbatim, the same way saveTeamAction does.
 */

/** `undefined` when blank, so the service's "keep what is stored" case fires. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const address = z
  .string()
  .trim()
  .refine((value) => SINGLE_ADDRESS.test(value), {
    // Deliberately the same rule lib/email.ts enforces at send time. Accepting
    // something here that the transport will refuse just moves the failure to
    // a place the owner cannot see it.
    message: "That needs to be a single email address, with no name or angle brackets.",
  });

export const saveEmailSettingsSchema = z
  .object({
    provider: z.enum(["SERVER", "RESEND", "SMTP"]),

    fromName: optionalText(80),
    fromAddress: address.optional().or(z.literal("").transform(() => undefined)),
    replyTo: address.optional().or(z.literal("").transform(() => undefined)),

    // Blank means "keep what is stored"; the matching clear flag is the only
    // way to remove one. Without the third state there would be no way to take
    // a key back out — see emailSettingsService.
    resendApiKey: optionalText(200),
    clearResendApiKey: z.boolean().default(false),

    smtpHost: optionalText(200),
    smtpPort: z.coerce
      .number()
      .int()
      .min(1, "A port is between 1 and 65535.")
      .max(65535, "A port is between 1 and 65535.")
      .optional(),
    smtpSecure: z.boolean().default(true),
    smtpUser: optionalText(200),
    smtpPassword: optionalText(200),
    clearSmtpPassword: z.boolean().default(false),
  })
  .strict()
  .superRefine((input, ctx) => {
    // Only what the chosen provider needs. Validating the SMTP fields while
    // Resend is selected would block a save on a half-filled section the owner
    // is not using.
    if (input.provider === "RESEND" && !input.fromAddress) {
      ctx.addIssue({
        code: "custom",
        path: ["fromAddress"],
        message: "Resend needs a from address — the one on the domain you verified with them.",
      });
    }

    if (input.provider === "SMTP") {
      if (!input.smtpHost) {
        ctx.addIssue({
          code: "custom",
          path: ["smtpHost"],
          message: "Enter your mail server's address, for example smtp.gmail.com.",
        });
      }
      if (!input.smtpPort) {
        ctx.addIssue({
          code: "custom",
          path: ["smtpPort"],
          message: "Enter the port your mail server uses — usually 465 or 587.",
        });
      }
      if (!input.fromAddress) {
        ctx.addIssue({
          code: "custom",
          path: ["fromAddress"],
          message: "Enter the address email should come from.",
        });
      }
    }
  });

export type SaveEmailSettingsInput = z.infer<typeof saveEmailSettingsSchema>;
