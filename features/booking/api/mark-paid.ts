"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { BookingNotFoundError, bookingService } from "@/server/services/bookingService";
import type { BookingActionResult } from "./confirm-booking";

const bookingIdSchema = z.object({ bookingId: z.string().min(1) });

export async function markBookingPaidAction(input: unknown): Promise<BookingActionResult> {
  await requireAdmin();

  const parsed = bookingIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That booking reference isn't valid." };
  }

  try {
    await bookingService.markPaid(parsed.data.bookingId);
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return { ok: false, error: "That booking no longer exists — this list is out of date." };
    }
    throw error;
  }

  return { ok: true, message: "Marked as paid." };
}
