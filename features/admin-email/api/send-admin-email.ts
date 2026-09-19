"use server";

import type { MailStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth-guards";
import { sendEmailWith } from "@/lib/email";
import { diagnoseEmailConfig } from "@/lib/email-config";
import { mapSendError } from "@/lib/email-errors";
import { emailPlainText, emailShell, plainTextToHtml } from "@/lib/email-shell";
import { rateLimit } from "@/lib/rate-limit";
import { bookingService } from "@/server/services/bookingService";
import { leadService } from "@/server/services/leadService";
import { mailMessageService, type MailSubject } from "@/server/services/mailMessageService";
import { sendAdminEmailSchema, type EmailSubject } from "../schema/send-email.schema";

export type SendEmailResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * How many messages one member of staff may send, and how many one customer may
 * receive.
 *
 * Keyed on the admin and on the recipient rather than on an IP: the threat here
 * is not a stranger at the door — they cannot reach this at all — it is a
 * compromised session or a stuck retry loop in a browser tab. The second limit
 * is what stops one customer being mailed two hundred times.
 *
 * In memory and per instance, the same honest limitation lib/login-throttle.ts
 * records about itself. It bounds a mistake; it is not a defence against a
 * determined attacker who already holds an admin session, at which point the
 * email is the least of the problems.
 */
const PER_ADMIN = { windowMs: 60_000, max: 10 };
const PER_RECIPIENT = { windowMs: 60 * 60_000, max: 6 };

/** The record, its recipient, and how the log row should hang off it. */
async function loadSubject(
  subject: EmailSubject,
): Promise<{ email: string; name: string; log: MailSubject } | null> {
  if (subject.kind === "booking") {
    const booking = await bookingService.getBookingById(subject.bookingId);
    if (!booking) return null;
    return {
      email: booking.customerEmail,
      name: booking.customerName,
      log: { kind: "booking", bookingId: booking.id },
    };
  }

  const lead = await leadService.getLeadById(subject.leadId);
  if (!lead) return null;
  return { email: lead.email, name: lead.name, log: { kind: "lead", leadId: lead.id } };
}

/**
 * Sends a message a member of staff typed, to the customer or enquirer it
 * belongs to.
 *
 * The recipient is never taken from the input — see the schema for why there is
 * no field for one. Everything else is sent verbatim: no placeholder is
 * substituted at this point, so what was in the box is what goes out and what
 * is logged.
 */
export async function sendAdminEmailAction(input: unknown): Promise<SendEmailResult> {
  const admin = await requireAdmin();

  const parsed = sendAdminEmailSchema.safeParse(input);
  if (!parsed.success) {
    // The schema's messages are written as user-facing copy.
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That message can't be sent as it is.",
    };
  }

  const { subject, subjectLine, body, templateKey } = parsed.data;

  const perAdmin = rateLimit(`admin-email:${admin.email ?? "unknown"}`, PER_ADMIN);
  if (!perAdmin.success) {
    return {
      ok: false,
      error: `That's a lot of email at once. Try again in ${perAdmin.retryAfterSeconds} seconds.`,
    };
  }

  const target = await loadSubject(subject);
  if (!target) {
    return { ok: false, error: "That record no longer exists — this list is out of date." };
  }

  const perRecipient = rateLimit(`admin-email-to:${target.email}`, PER_RECIPIENT);
  if (!perRecipient.success) {
    return {
      ok: false,
      error: `${target.name} has had several emails from us in the last hour. Give it a little while.`,
    };
  }

  const { config } = await diagnoseEmailConfig();

  // Attempt first, log second. Never the other way round: a crash between a
  // write and a send leaves a row claiming a message went out that never did,
  // and the front desk reads these rows to decide whether to contact someone
  // again. No transaction either — the send is not transactional, so the log
  // records what actually happened rather than what was intended.
  let status: MailStatus = "SENT";
  let error: string | undefined;

  try {
    const outcome = await sendEmailWith(config, {
      to: target.email,
      subject: subjectLine,
      html: emailShell(plainTextToHtml(body)),
      text: emailPlainText(body),
    });
    if (!outcome.delivered) status = "SKIPPED";
  } catch (caught) {
    console.error("[admin-email] send failed", caught);
    status = "FAILED";
    error = mapSendError(caught);
  }

  try {
    await mailMessageService.record({
      subject: target.log,
      toEmail: target.email,
      subjectLine,
      body,
      templateKey,
      status,
      provider: config.provider === "NONE" ? undefined : config.provider,
      error,
      senderEmail: admin.email,
      senderName: admin.name,
    });
  } catch (caught) {
    // The message may well have gone out. Losing the record of it is bad, but
    // it must not be reported as a failure to send — that would have someone
    // send it a second time.
    console.error("[admin-email] could not record the sent message", caught);
  }

  if (status === "FAILED") {
    return { ok: false, error: error ?? "The message could not be sent." };
  }

  if (status === "SKIPPED") {
    return {
      ok: true,
      message: `Saved to ${target.name}'s history — but email isn't set up yet, so nothing was sent. Set it up in Settings.`,
    };
  }

  return { ok: true, message: `Sent to ${target.email}.` };
}
