"use server";

import { requireAdmin } from "@/lib/auth-guards";
import { emailSettingsService } from "@/server/services/emailSettingsService";
import { saveEmailSettingsSchema } from "../schema/email-settings.schema";

export type EmailSettingsActionResult =
  { ok: true; message: string } | { ok: false; error: string };

/**
 * Stores the business's mail configuration.
 *
 * Returns a result rather than void, unlike the payments toggle it sits beside
 * on the settings page: that older shape is why CLAUDE.md records every
 * dashboard button appearing dead for months.
 */
export async function saveEmailSettingsAction(input: unknown): Promise<EmailSettingsActionResult> {
  const admin = await requireAdmin();

  const parsed = saveEmailSettingsSchema.safeParse(input);
  if (!parsed.success) {
    // The schema's messages are written as user-facing copy, so the first
    // issue is worth showing verbatim — the same choice saveTeamAction makes.
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Some of those details aren't valid.",
    };
  }

  const data = parsed.data;

  await emailSettingsService.saveSettings({
    provider: data.provider,
    fromName: data.fromName ?? null,
    fromAddress: data.fromAddress ?? null,
    replyTo: data.replyTo ?? null,
    smtpHost: data.smtpHost ?? null,
    smtpPort: data.smtpPort ?? null,
    smtpSecure: data.smtpSecure,
    smtpUser: data.smtpUser ?? null,
    resendApiKey: data.resendApiKey,
    clearResendApiKey: data.clearResendApiKey,
    smtpPassword: data.smtpPassword,
    clearSmtpPassword: data.clearSmtpPassword,
    updatedByEmail: admin.email,
  });

  // No revalidation: nothing caches the email settings, and every send reads
  // them fresh.
  if (data.provider === "SERVER") {
    return { ok: true, message: "Saved. Email will use the configuration set on the server." };
  }

  return { ok: true, message: "Saved. Send yourself a test message to check it works." };
}
