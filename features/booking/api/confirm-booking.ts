"use server";

import { services } from "@/config/content/services";
import { getBusiness } from "@/features/site-settings";
import { siteConfig } from "@/config/site.config";
import { requireAdmin } from "@/lib/auth-guards";
import { sendEmail } from "@/lib/email";
import {
  BookingNotConfirmableError,
  BookingNotFoundError,
  bookingService,
} from "@/server/services/bookingService";
import { confirmBookingSchema } from "../schema/booking-actions.schema";
import { bookingConfirmedEmail } from "./booking-emails";

export type BookingActionResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Mark a booking as agreed with the patient, optionally recording the call.
 *
 * The note is a payload rather than a trigger: confirming and writing down
 * what was said are separate decisions made in the same breath, so the
 * receptionist types once and both are written.
 *
 * No revalidatePath — nothing here is cached and the client calls
 * router.refresh(); see features/reviews/api/moderate-review.ts.
 */
export async function confirmBookingAction(input: unknown): Promise<BookingActionResult> {
  const admin = await requireAdmin();

  const parsed = confirmBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That booking reference isn't valid." };
  }

  let booking;
  try {
    booking = await bookingService.confirmBooking(parsed.data.bookingId);
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return { ok: false, error: "That booking no longer exists — this list is out of date." };
    }
    if (error instanceof BookingNotConfirmableError) {
      return { ok: false, error: "That booking was cancelled, so it can't be confirmed." };
    }
    throw error;
  }

  if (parsed.data.note) {
    await bookingService.addBookingNote({
      bookingId: booking.id,
      outcome: parsed.data.note.outcome,
      body: parsed.data.note.body,
      authorEmail: admin.email,
      authorName: admin.name,
    });
  }

  // Unlike the public booking path, a dashboard action can *tell someone* the
  // email failed — the receptionist is on the phone with the patient right now
  // and can say the time out loud.
  const service = services.find((candidate) => candidate.slug === booking.serviceSlug);
  let delivered = false;
  try {
    const outcome = await sendEmail({
      to: booking.customerEmail,
      ...bookingConfirmedEmail({
        businessPhone: (await getBusiness()).phone,
        customerName: booking.customerName,
        serviceName: service?.name ?? booking.serviceSlug,
        startsAt: booking.slot.startsAt,
      }),
    });
    delivered = outcome.delivered;

    // Only when something actually went out. sendEmail resolves without
    // sending when no transport is configured, so marking on the mere absence
    // of a throw recorded a confirmation email that never existed — and that
    // flag is what stops the Stripe webhook's retry re-attempting the send.
    if (delivered) await bookingService.markConfirmationEmailSent(booking.id);
  } catch (error) {
    console.error(`[booking] confirmation email failed for booking ${booking.id}`, error);
    return {
      ok: true,
      message: `Confirmed — but we couldn't email ${booking.customerEmail}. Tell them on the call.`,
    };
  }

  if (!delivered) {
    // Not a failure — the appointment is confirmed. But whoever is on the
    // phone right now has to know the customer will hear nothing.
    return {
      ok: true,
      message: `Confirmed — but email isn't set up, so nothing was sent to ${booking.customerEmail}. Tell them on the call.`,
    };
  }

  return { ok: true, message: `Confirmed. ${siteConfig.business.name} has emailed the customer.` };
}
