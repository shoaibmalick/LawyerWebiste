/**
 * Turning "Mon–Fri, 9am and 2pm, for the next six weeks" into concrete instants.
 *
 * Pure and timezone-aware, kept apart from the Server Action so it can be
 * unit-tested without a database. The hard part is that a business's opening
 * hours are wall-clock times in its own zone, while AvailabilitySlot.startsAt
 * is an absolute instant — and the offset between them changes across a DST
 * boundary. Generating six weeks of 9am slots by adding 24h repeatedly would
 * silently produce 8am or 10am slots after the clocks move.
 *
 * A slot is a unit of the business's time, so this no longer multiplies by
 * service: one row per (day, time), and the customer chooses a service when
 * they book.
 */

/** Milliseconds to add to an instant to get the same wall-clock time in `timeZone`. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // Intl renders midnight as hour 24 in some locales/zones.
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );

  return asUtc - instant.getTime();
}

/**
 * The instant at which it is `date` `time` in `timeZone`.
 *
 * Two passes: the first correction can itself land on the other side of a DST
 * transition, and re-measuring at the corrected instant settles it.
 */
export function zonedWallTimeToInstant(date: string, time: string, timeZone: string): Date {
  const naive = new Date(`${date}T${time}:00Z`);
  let instant = new Date(naive.getTime() - zoneOffsetMs(naive, timeZone));
  instant = new Date(naive.getTime() - zoneOffsetMs(instant, timeZone));
  return instant;
}

/** Which weekday (0 = Sunday) a YYYY-MM-DD falls on, read as a plain calendar date. */
function weekdayOf(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export type BuildSlotsInput = {
  /** Inclusive YYYY-MM-DD range. */
  from: string;
  to: string;
  /** 0 = Sunday … 6 = Saturday. */
  weekdays: number[];
  /** Wall-clock "HH:MM" in the business's own zone. */
  times: string[];
  /** How long each appointment slot runs. Services longer than this cannot be
   *  booked into it — see getAvailableSlots. */
  slotMinutes: number;
  timeZone: string;
};

export type BuiltSlot = {
  startsAt: Date;
  endsAt: Date;
};

/**
 * Every (day × time) combination in the range, as absolute instants.
 *
 * Deliberately does not deduplicate against what is already in the database —
 * `startsAt` is unique, so the insert handles that. This function is total and
 * predictable: same input, same output, no I/O.
 */
export function buildSlots(input: BuildSlotsInput): BuiltSlot[] {
  const { from, to, weekdays, times, slotMinutes, timeZone } = input;

  if (weekdays.length === 0 || times.length === 0 || slotMinutes <= 0) return [];
  if (from > to) return [];

  const wanted = new Set(weekdays);
  const slots: BuiltSlot[] = [];

  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (!wanted.has(weekdayOf(date))) continue;

    for (const time of times) {
      const startsAt = zonedWallTimeToInstant(date, time, timeZone);
      slots.push({
        startsAt,
        endsAt: new Date(startsAt.getTime() + slotMinutes * 60_000),
      });
    }
  }

  return slots;
}
