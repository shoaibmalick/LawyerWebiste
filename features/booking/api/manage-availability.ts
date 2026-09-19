"use server";

import { revalidatePath } from "next/cache";
import { services } from "@/config/content/services";
import { siteConfig } from "@/config/site.config";
import { requireAdmin } from "@/lib/auth-guards";
import {
  bookingService,
  SlotHasBookingsError,
  BookingSlotNotFoundError,
} from "@/server/services/bookingService";
import { buildSlots } from "./build-slots";
import {
  deleteAvailabilitySchema,
  generateAvailabilitySchema,
} from "../schema/availability.schema";

export type AvailabilityActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function generateAvailabilityAction(
  input: unknown,
): Promise<AvailabilityActionResult> {
  await requireAdmin();

  const parsed = generateAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Those settings aren't valid." };
  }

  // Warn rather than block: a business is allowed to run slots shorter than its
  // longest service, it just means that service cannot be booked online into
  // them. Silently generating unusable availability would be worse.
  const tooLong = services.filter((service) => service.durationMinutes > parsed.data.slotMinutes);

  const slots = buildSlots({
    from: parsed.data.from,
    to: parsed.data.to,
    weekdays: parsed.data.weekdays,
    times: parsed.data.times,
    slotMinutes: parsed.data.slotMinutes,
    // Opening hours are wall-clock times at the business, not at whatever
    // timezone the server happens to run in.
    timeZone: siteConfig.business.timezone,
  });

  if (slots.length === 0) {
    return { ok: false, error: "That range produced no slots — check the weekdays and dates." };
  }

  const { created, skipped } = await bookingService.createSlots(slots, parsed.data.capacity);

  revalidatePath("/dashboard/availability");
  revalidatePath("/");

  const base =
    skipped > 0
      ? `Added ${created} slots. Skipped ${skipped} that already existed.`
      : `Added ${created} slots.`;

  const warning =
    tooLong.length > 0
      ? ` Note: ${tooLong.map((service) => service.name).join(", ")} ${
          tooLong.length === 1 ? "is" : "are"
        } longer than ${parsed.data.slotMinutes} minutes and cannot be booked into these slots.`
      : "";

  return { ok: true, message: base + warning };
}

export async function deleteAvailabilityAction(input: unknown): Promise<AvailabilityActionResult> {
  await requireAdmin();

  const parsed = deleteAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That slot reference isn't valid." };
  }

  let removedCancelledBookings = 0;
  try {
    ({ removedCancelledBookings } = await bookingService.deleteSlot(parsed.data.slotId));
  } catch (error) {
    if (error instanceof SlotHasBookingsError) {
      return { ok: false, error: "That slot has a booking — cancel the booking first." };
    }
    if (error instanceof BookingSlotNotFoundError) {
      return { ok: false, error: "That slot no longer exists." };
    }
    throw error;
  }

  revalidatePath("/dashboard/availability");
  revalidatePath("/");

  return {
    ok: true,
    message:
      removedCancelledBookings > 0
        ? `Slot removed, along with ${removedCancelledBookings} cancelled booking${
            removedCancelledBookings === 1 ? "" : "s"
          } that referenced it.`
        : "Slot removed.",
  };
}

/** Read side for the dashboard page. */
export async function listUpcomingAvailability() {
  await requireAdmin();
  return bookingService.listUpcomingSlots();
}
