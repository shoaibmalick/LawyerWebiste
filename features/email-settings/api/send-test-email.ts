"use server";

import { requireAdmin } from "@/lib/auth-guards";
import { sendEmailWith } from "@/lib/email";
import { describeTransport, diagnoseEmailConfig } from "@/lib/email-config";
import { emailPlainText, emailShell, plainTextToHtml } from "@/lib/email-shell";
import { mapSendError } from "@/lib/email-errors";
import type { EmailSettingsActionResult } from "./save-email-settings";

/**
 * Sends the signed-in admin a message using whatever is currently *stored*.
 *
 * ## Why it tests the saved configuration and not the form
 *
 * Testing unsaved values would mean posting a plaintext credential to a second
 * action, so it crosses the wire twice and the server holds one that is
 * persisted nowhere. Worse, a green result against values that were never saved
 * is not evidence that *sending* will work — which is the only reason this
 * button exists. The form disables it while it is dirty and asks for a save
 * first.
 *
 * ## Why it goes to the admin's own address
 *
 * Not an address they type: an admin session that can email anywhere is worth
 * having to a spammer, and the same argument keeps a recipient field off the
 * compose panel. Not the business address from config either — the point is to
 * watch it arrive, and reception cannot see the business's shared inbox from
 * every desk.
 *
 * Test sends are not written to MailMessage. That log is a record of
 * correspondence with a customer, and this is neither.
 */
export async function sendTestEmailAction(): Promise<EmailSettingsActionResult> {
  const admin = await requireAdmin();

  if (!admin.email) {
    return {
      ok: false,
      error: "Your admin account has no email address, so there's nowhere to send a test.",
    };
  }

  const { config } = await diagnoseEmailConfig();
  if (config.provider === "NONE") {
    return {
      ok: false,
      error: "There's no email configuration to test yet. Choose a provider and save it first.",
    };
  }

  const description = describeTransport(config);
  // Named in the body as well as the result, so the message that lands proves
  // which configuration is live — the same settings can look right and be
  // overridden by the environment.
  const body = `This is a test message from your website's dashboard.\n\nIf you're reading it, email is working.\n\nSent via ${description}.`;

  try {
    await sendEmailWith(config, {
      to: admin.email,
      subject: "Test message from your website",
      html: emailShell(plainTextToHtml(body)),
      text: emailPlainText(body),
    });
  } catch (error) {
    console.error("[email-settings] test send failed", error);
    return { ok: false, error: mapSendError(error) };
  }

  return { ok: true, message: `Sent to ${admin.email} via ${description}. Check your inbox.` };
}
