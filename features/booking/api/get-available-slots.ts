import { services } from "@/config/content/services";
import { bookingService } from "@/server/services/bookingService";

export type BookableSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  /** Minutes the slot runs for — a longer service cannot use it. */
  durationMinutes: number;
  /**
   * Slugs of the services that fit inside this slot.
   *
   * A slot is a unit of the business's time, not of a service, so which
   * services it can host is a duration question rather than an ownership one.
   * Precomputed here because config/content/services.ts is the source of
   * durations and the booking form should not have to re-derive it.
   */
  fitsServiceSlugs: string[];
};

/**
 * Availability, or none of it if the database cannot be reached.
 *
 * An empty list is already a designed state here rather than an error one: the
 * form lists every service whether or not anything is bookable, and the block
 * renders the telephone number beside it, so a visitor can still say what they
 * want. Throwing instead returned a 500 for the whole of /consultation — a page
 * whose entire purpose is to let someone get in touch.
 *
 * It is an honest degradation rather than a perfect one. "No times available"
 * is not quite the same statement as "we cannot reach the calendar", and a
 * visitor is told the first when the second is true. The alternative on the
 * table was an error page, and between the two, the one that still carries a
 * telephone number wins. The log line is what tells an operator which it was.
 */
export async function getAvailableSlots(): Promise<BookableSlot[]> {
  let slots;
  try {
    slots = await bookingService.listAvailableSlots();
  } catch (error) {
    console.error("[booking] could not read availability; showing none", error);
    return [];
  }

  return slots.map((slot) => {
    const durationMinutes = Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000);

    return {
      id: slot.id,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      durationMinutes,
      fitsServiceSlugs: services
        .filter((service) => service.durationMinutes <= durationMinutes)
        .map((service) => service.slug),
    };
  });
}
