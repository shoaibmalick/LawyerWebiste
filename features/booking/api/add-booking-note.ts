"use server";

import { requireAdmin } from "@/lib/auth-guards";
import { BookingNotFoundError, bookingService } from "@/server/services/bookingService";
import { addBookingNoteSchema } from "../schema/booking-actions.schema";
import type { BookingActionResult } from "./confirm-booking";

/**
 * Record a call without changing anything else.
 *
 * "Rang, no answer" is the commonest outcome of a follow-up call and is not a
 * status change — the appointment is still exactly where it was. Keeping this
 * separate from confirm/cancel is what stops an outcome silently implying one.
 */
export async function addBookingNoteAction(input: unknown): Promise<BookingActionResult> {
  const admin = await requireAdmin();

  const parsed = addBookingNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That note isn't valid." };
  }

  try {
    await bookingService.addBookingNote({
      bookingId: parsed.data.bookingId,
      outcome: parsed.data.note.outcome,
      body: parsed.data.note.body,
      authorEmail: admin.email,
      authorName: admin.name,
    });
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return { ok: false, error: "That booking no longer exists — this list is out of date." };
    }
    throw error;
  }

  return { ok: true, message: "Note saved." };
}
