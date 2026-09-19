import { z } from "zod";
import { siteConfig } from "@/config/site.config";
import { BookingStatus } from "@/generated/prisma/enums";
import type { BookingFilters, BookingView } from "@/server/services/bookingService";
import { zonedWallTimeToInstant } from "../api/build-slots";

export const bookingStatusSchema = z.enum(BookingStatus);
export const bookingIdSchema = z.object({ bookingId: z.string().min(1) }).strict();

const MAX_TERM = 200;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const VIEWS = ["requests", "followup", "upcoming", "all"] as const;

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function term(raw: string | string[] | undefined): string | undefined {
  const value = first(raw)?.trim();
  if (!value || value.length > MAX_TERM) return undefined;
  return value;
}

/**
 * Which slice of the bookings list to show.
 *
 * Defaults to `requests` because that is the view with work waiting in it —
 * the same reasoning that makes the reviews page open on Pending. Anything
 * unrecognised falls back rather than 404ing: a mistyped URL should show the
 * receptionist something useful.
 */
export function parseBookingView(raw: string | string[] | undefined): BookingView {
  const value = first(raw)?.trim().toLowerCase();
  return (VIEWS as readonly string[]).includes(value ?? "") ? (value as BookingView) : "requests";
}

/**
 * Turn the query string into filters the service understands.
 *
 * Forgiving in every direction, for the same reason `parseLeadFilters` is: a
 * blank box submits as `?q=` and must mean "no filter" rather than "match the
 * empty string", and an unparseable date is dropped instead of erroring. The
 * worst outcome of guessing wrong is showing more rows than intended — never
 * fewer, which would look like data loss.
 */
export function parseBookingFilters(
  params: Record<string, string | string[] | undefined>,
  knownServiceSlugs: readonly string[] = [],
): BookingFilters {
  const filters: BookingFilters = {};

  const q = term(params.q);
  if (q) filters.q = q;

  const status = first(params.status)?.trim().toUpperCase();
  const parsedStatus = status ? bookingStatusSchema.safeParse(status) : undefined;
  if (parsedStatus?.success) filters.status = parsedStatus.data;

  const service = term(params.service);
  // Checked against real services so a stale bookmark can't silently filter
  // everything out with a slug that no longer exists.
  if (service && knownServiceSlugs.includes(service)) filters.serviceSlug = service;

  // Dates arrive as YYYY-MM-DD — a wall-clock day at the practice, not an
  // instant. Converted through the DST-correct helper the availability
  // generator already uses; `new Date("2026-08-10")` would be UTC midnight and
  // land on the wrong day for anyone west of Greenwich.
  const from = first(params.from)?.trim();
  if (from && DATE.test(from)) {
    filters.from = zonedWallTimeToInstant(from, "00:00", siteConfig.business.timezone);
  }

  const to = first(params.to)?.trim();
  if (to && DATE.test(to)) {
    // The NEXT midnight, so a range ending on the appointment's own day still
    // includes it. buildBookingWhere pairs this with `lt`.
    filters.to = zonedWallTimeToInstant(nextDay(to), "00:00", siteConfig.business.timezone);
  }

  return filters;
}

/** YYYY-MM-DD → the following calendar day, in the same wall-clock terms. */
function nextDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  // UTC arithmetic purely to roll the calendar over month and year ends; the
  // result is fed straight back through zonedWallTimeToInstant as wall time.
  const rolled = new Date(Date.UTC(year, month - 1, day + 1));
  return rolled.toISOString().slice(0, 10);
}

export function hasBookingFilters(filters: BookingFilters): boolean {
  return Object.keys(filters).length > 0;
}
