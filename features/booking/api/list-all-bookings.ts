import { requireAdmin } from "@/lib/auth-guards";
import {
  bookingService,
  type BookingFilters,
  type BookingView,
} from "@/server/services/bookingService";

/**
 * The dashboard bookings list.
 *
 * Guarded even though it only reads. This is exported from the feature barrel,
 * so anything in the app could reach it, and it returns every patient's name,
 * email address and phone number. proxy.ts covers the page it is called from
 * today, but that is a routing rule rather than a property of this function.
 */
export async function listAllBookings(filters: BookingFilters = {}, view: BookingView = "all") {
  await requireAdmin();

  return bookingService.listAllBookings(filters, view);
}

/**
 * Appointments coming up inside the practice's follow-up window.
 *
 * Takes filters like every other list. It used to take only the window, while
 * the page drew the filter form above it regardless — so on this tab the
 * search box, the treatment picker and the status picker all appeared dead.
 */
export async function listBookingsForFollowUp(windowDays: number, filters: BookingFilters = {}) {
  await requireAdmin();

  return bookingService.listBookingsForFollowUp(windowDays, filters);
}
