"use server";

import { services } from "@/config/content/services";
import { getBusiness } from "@/features/site-settings";
import { siteConfig } from "@/config/site.config";
import { requireAdmin } from "@/lib/auth-guards";
import { sendEmail } from "@/lib/email";
import {
  BookingContentionError,
  BookingNotFoundError,
  BookingNotReschedulableError,
  bookingService,
  BookingSlotFullError,
  BookingSlotNotFoundError,
  type RescheduleTarget,
} from "@/server/services/bookingService";
import { rescheduleBookingSchema } from "../schema/booking-actions.schema";
import { zonedWallTimeToInstant } from "./build-slots";
import { bookingRescheduledEmail } from "./booking-emails";
import type { BookingActionResult } from "./confirm-booking";

/**
 * Move an appointment to a time agreed on the phone.
 *
 * The override path builds the instant from wall-clock date + time through
 * zonedWallTimeToInstant. `new Date("2026-11-01T19:00")` would be parsed in the
 * *server's* zone — UTC on Vercel — and land the appointment hours away, which
 * is the same class of bug lib/format.ts documents as a four-hour error.
 */
export async function rescheduleBookingAction(input: unknown): Promise<BookingActionResult> {
  const admin = await requireAdmin();

  const parsed = rescheduleBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Those details aren't valid." };
  }

  // Read before the move so the email can show where the appointment came
  // from. Both times in that email are persisted values, never form input.
  const previous = await bookingService.getBookingById(parsed.data.bookingId);
  if (!previous) {
    return { ok: false, error: "That booking no longer exists — this list is out of date." };
  }

  const service = services.find((candidate) => candidate.slug === previous.serviceSlug);
  const durationMinutes = service?.durationMinutes ?? 60;

  let target: RescheduleTarget;
  if (parsed.data.target.kind === "slot") {
    target = { kind: "slot", slotId: parsed.data.target.slotId };
  } else {
    const startsAt = zonedWallTimeToInstant(
      parsed.data.target.date,
      parsed.data.target.time,
      siteConfig.business.timezone,
    );
    if (startsAt.getTime() <= Date.now()) {
      return { ok: false, error: "That time has already passed — pick a later one." };
    }
    // Computed from the service, so an override slot can never be too short for
    // the treatment by construction.
    target = {
      kind: "override",
      startsAt,
      endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000),
    };
  }

  let result;
  try {
    result = await bookingService.rescheduleBooking({
      bookingId: parsed.data.bookingId,
      target,
      confirm: parsed.data.confirm,
    });
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return { ok: false, error: "That booking no longer exists — this list is out of date." };
    }
    if (error instanceof BookingNotReschedulableError) {
      return { ok: false, error: "That booking was cancelled, so it can't be moved." };
    }
    if (error instanceof BookingSlotNotFoundError) {
      return { ok: false, error: "That time is no longer on the calendar — pick another." };
    }
    if (error instanceof BookingSlotFullError) {
      return {
        ok: false,
        error: "Someone took that time while you were on the call — pick another.",
      };
    }
    if (error instanceof BookingContentionError) {
      return { ok: false, error: "Couldn't move it just now — try again in a moment." };
    }
    throw error;
  }

  if (parsed.data.note) {
    await bookingService.addBookingNote({
      bookingId: result.booking.id,
      outcome: parsed.data.note.outcome,
      body: parsed.data.note.body,
      authorEmail: admin.email,
      authorName: admin.name,
    });
  }

  if (!result.moved) {
    return {
      ok: true,
      message: parsed.data.confirm
        ? "Confirmed for the time it was already booked for."
        : "That was already the appointment's time — nothing moved.",
    };
  }

  try {
    await sendEmail({
      to: result.booking.customerEmail,
      ...bookingRescheduledEmail({
        businessPhone: (await getBusiness()).phone,
        customerName: result.booking.customerName,
        serviceName: service?.name ?? result.booking.serviceSlug,
        // Both times read back from the persisted slots, never from the form.
        previousStartsAt: previous.slot.startsAt,
        startsAt: result.booking.slot.startsAt,
        confirmed: parsed.data.confirm,
      }),
    });
    if (parsed.data.confirm) {
      await bookingService.markConfirmationEmailSent(result.booking.id);
    }
  } catch (error) {
    console.error(`[booking] reschedule email failed for booking ${result.booking.id}`, error);
    return {
      ok: true,
      message: `Moved — but we couldn't email ${result.booking.customerEmail}. Tell them the new time on the call.`,
    };
  }

  return { ok: true, message: "Moved, and the customer has been emailed the new time." };
}
