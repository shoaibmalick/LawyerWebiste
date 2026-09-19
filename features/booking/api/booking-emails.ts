import { siteConfig } from "@/config/site.config";
import { formatDateTimeLong } from "@/lib/format";
import { escapeHtml } from "@/lib/html";

/**
 * Every email the booking workflow sends, as pure functions.
 *
 * No I/O and no Resend here — lib/email.ts stays the transport. That makes
 * these unit-testable in the node environment with no database and no network,
 * which matters because the thing most likely to go wrong in an appointment
 * email is the *time*, and that is exactly what a test can pin.
 *
 * Every time is formatted from the slot read back after the write, never from
 * form input, and always through formatDateTimeLong so the practice's timezone
 * and the zone name are both present.
 */

type Appointment = {
  customerName: string;
  serviceName: string;
  startsAt: Date;
  /**
   * The business's current phone number.
   *
   * Passed in rather than read at module load, because it is editable from
   * /dashboard/settings now. It used to be a module-scope constant, which meant
   * the number was baked in when the process started and every email sent for
   * the life of that process carried the old one — a change nobody would notice
   * until a customer rang a disconnected line.
   *
   * Optional, so a caller that has not been updated still sends the configured
   * number rather than an empty string.
   */
  businessPhone?: string;
};

const business = siteConfig.business;

/**
 * The practice's name, escaped once at module load.
 *
 * It comes from config rather than from a form, so it is not the attack
 * surface — but a name like "Reid & Sons Dental" is still wrong in an email
 * body unescaped, and escaping here means no template has to remember which of
 * its interpolations were the trusted ones.
 *
 * The phone number used to sit beside this and no longer can: it is editable
 * from the dashboard, so it is escaped per call instead. See `phoneFor`.
 */
const businessName = escapeHtml(business.name);

/** The caller's number if it has one, otherwise the configured one — escaped either way. */
function phoneFor(businessPhone?: string): string {
  return escapeHtml(businessPhone ?? business.phone);
}

/**
 * The patient has asked for a time. Nothing is booked yet, and this email has
 * one job: make sure they do not turn up.
 */
export function bookingRequestReceivedEmail({
  customerName,
  serviceName,
  startsAt,
  businessPhone,
}: Appointment) {
  const phone = phoneFor(businessPhone);
  return {
    subject: `We've got your appointment request — ${business.name}`,
    html: `
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Thanks for asking to come in for ${escapeHtml(serviceName)} on
      ${formatDateTimeLong(startsAt)}.</p>
      <p><strong>This time isn't booked yet.</strong> One of our team will call you shortly to
      confirm it, or to find you another time if it has gone.</p>
      <p>If you'd rather not wait, call us on ${phone}.</p>
      <p>${businessName}</p>
    `,
  };
}

/**
 * The practice's own copy. Nothing was sent here before — a request nobody is
 * told about is a request nobody rings back.
 */
export function bookingRequestNotificationEmail({
  customerName,
  customerEmail,
  customerPhone,
  serviceName,
  startsAt,
  dashboardUrl,
}: Appointment & {
  customerEmail: string;
  customerPhone?: string | null;
  dashboardUrl: string;
}) {
  return {
    subject: `New booking request — ${serviceName}, ${formatDateTimeLong(startsAt)}`,
    html: `
      <p>${escapeHtml(customerName)} has requested ${escapeHtml(serviceName)} at
      ${formatDateTimeLong(startsAt)}.</p>
      <p>${escapeHtml(customerEmail)}${
        customerPhone ? ` · ${escapeHtml(customerPhone)}` : " · no phone given"
      }</p>
      <p>Confirm, move or cancel it:
      <a href="${escapeHtml(dashboardUrl)}">${escapeHtml(dashboardUrl)}</a></p>
    `,
  };
}

/** Sent when the receptionist confirms on the phone, and by the Stripe webhook. */
export function bookingConfirmedEmail({
  customerName,
  serviceName,
  startsAt,
  businessPhone,
}: Appointment) {
  const phone = phoneFor(businessPhone);
  return {
    subject: `Your appointment is confirmed — ${business.name}`,
    html: `
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Your ${escapeHtml(serviceName)} appointment is confirmed for
      ${formatDateTimeLong(startsAt)}. We'll see you then.</p>
      <p>If you need to change it, call us on ${phone}.</p>
      <p>${businessName}</p>
    `,
  };
}

/**
 * Sent when the receptionist moves an appointment on the call.
 *
 * Shows both times deliberately. "Your appointment has moved to Tuesday" is
 * ambiguous to someone who has two appointments; showing what it moved *from*
 * removes the doubt.
 */
export function bookingRescheduledEmail({
  customerName,
  serviceName,
  previousStartsAt,
  startsAt,
  confirmed,
  businessPhone,
}: Appointment & { previousStartsAt: Date; confirmed: boolean }) {
  const phone = phoneFor(businessPhone);
  return {
    subject: `Your appointment has moved — ${business.name}`,
    html: `
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>As agreed on the phone, your ${escapeHtml(serviceName)} appointment has moved.</p>
      <p>Was: ${formatDateTimeLong(previousStartsAt)}<br />
      <strong>Now: ${formatDateTimeLong(startsAt)}</strong></p>
      <p>${
        confirmed
          ? "That time is confirmed — we'll see you then."
          : "We'll call you back to confirm this time."
      }</p>
      <p>Any problem with that, call us on ${phone}.</p>
      <p>${businessName}</p>
    `,
  };
}
