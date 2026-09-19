import { siteConfig } from "@/config/site.config";

/**
 * An appointment time, in the business's own timezone.
 *
 * Two things are pinned deliberately, and both were bugs:
 *
 * The locale is pinned to "en-US" so server- and client-rendered output are
 * byte-identical — an unpinned toLocaleString() resolves against Node's ICU
 * default on the server and the browser's locale on the client, which silently
 * differ and trigger a hydration mismatch.
 *
 * The timezone is pinned to the business's, because it was previously left to
 * the runtime. Vercel runs UTC, so a 1:00 PM appointment appeared as 5:00 PM in
 * the dashboard, on the customer's account page, and in the confirmation email
 * — a four-hour error in the one detail the whole booking exists to convey. It
 * defaults rather than being a required argument so that no call site can
 * reproduce that by forgetting it; pass an override only for a genuinely
 * different zone.
 */
export function formatDateTime(
  date: Date,
  timeZone: string = siteConfig.business.timezone,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * A submission date — when a review was left, when a lead came in.
 *
 * Same two pins as above, and the timezone one matters *more* here rather than
 * less. A four-hour drift on a time is wrong by four hours; on a date-only
 * value it is wrong by a whole day. A review left at 11:30 PM in Toronto is
 * already tomorrow in UTC, so an unpinned formatter would file it under the
 * wrong date entirely.
 *
 * Includes the year, unlike formatDateTime — these are archive lists read by
 * date, and "Aug 6" stops being useful the moment a practice has two years of
 * leads in the table.
 */
export function formatDate(date: Date, timeZone: string = siteConfig.business.timezone): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * A calendar date that is a date, not an instant.
 *
 * `formatDate` pins to the business timezone, which is right for anything that
 * happened at a moment — a lead arrived, a review was left. It is wrong for a
 * date somebody picked out of a date input, and wrong in a way that is easy to
 * ship and hard to spot.
 *
 * A `<input type="date">` submits "2026-12-18" with no zone. Stored as UTC
 * midnight and then read back in Toronto, that is 7pm on the 17th, so it
 * formats as **December 17** — the customer picks a date and the business
 * reads the day before it. Found on a catering enquiry, where the consequence
 * is a kitchen cooking for a hundred and twenty people on the wrong day.
 *
 * So: format in UTC, matching how it was stored. Nothing is being converted,
 * because there was never a time to convert.
 *
 * Use this whenever the column holds a day rather than a moment. Use
 * `formatDate` for the rest.
 */
export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Longer form for emails, where there is room and no ambiguity is welcome.
 * Includes the zone name so a customer reading it elsewhere can tell which
 * clock the time refers to.
 */
export function formatDateTimeLong(
  date: Date,
  timeZone: string = siteConfig.business.timezone,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
