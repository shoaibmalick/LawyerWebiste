/**
 * Mapping slots onto calendar days.
 *
 * Two clocks meet here and they are not the same one. A slot's `startsAt` is an
 * absolute instant; the calendar hands back a Date at the *visitor's* local
 * midnight. Both have to be reduced to the same label — the day as the business
 * would name it — or a visitor in another region sees an evening opening filed
 * under the wrong date, and the day they click yields no times.
 *
 * Extracted from the booking form so it can be tested. It could not be before,
 * and it is exactly the logic where a timezone mistake hides quietly.
 */

/**
 * The calendar day a slot falls on *at the business*, as YYYY-MM-DD.
 *
 * en-CA is used purely because it formats as YYYY-MM-DD; the locale carries no
 * other meaning here.
 */
export function businessDayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/**
 * The same key for a Date the calendar hands back.
 *
 * Read with local getters on purpose. react-day-picker constructs each day at
 * the visitor's local midnight, so the visitor's own calendar date *is* the
 * label they clicked — converting it to UTC first would shift it a day for
 * anyone west of Greenwich.
 */
export function calendarDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
