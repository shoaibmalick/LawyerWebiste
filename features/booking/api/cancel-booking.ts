"use server";

import { requireAdmin } from "@/lib/auth-guards";
import { BookingNotFoundError, bookingService } from "@/server/services/bookingService";
import { cancelBookingSchema } from "../schema/booking-actions.schema";
import type { BookingActionResult } from "./confirm-booking";

/**
 * Returns a result rather than void — see the note in
 * features/reviews/api/moderate-review.ts. Cancelling is the most consequential
 * button on the bookings page and gave no sign it had worked.
 *
 * Takes an optional note for the same reason confirm does: "she's cancelling,
 * moving house" is written down in the same breath as the cancellation.
 */
export async function cancelBookingAction(input: unknown): Promise<BookingActionResult> {
  const admin = await requireAdmin();

  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That booking reference isn't valid." };
  }

  try {
    await bookingService.cancelBooking(parsed.data.bookingId);
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return { ok: false, error: "That booking no longer exists — this list is out of date." };
    }
    throw error;
  }

  if (parsed.data.note) {
    await bookingService.addBookingNote({
      bookingId: parsed.data.bookingId,
      outcome: parsed.data.note.outcome,
      body: parsed.data.note.body,
      authorEmail: admin.email,
      authorName: admin.name,
    });
  }

  return { ok: true, message: "Cancelled. The time is available again." };
}
