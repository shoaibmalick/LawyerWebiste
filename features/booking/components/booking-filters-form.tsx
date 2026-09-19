import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FIELD } from "@/components/ui/field";
import { BookingStatus } from "@/generated/prisma/enums";
import {
  VIEW_STATUSES,
  type BookingFilters,
  type BookingView,
} from "@/server/services/bookingService";
import { STAFF_STATUS_LABEL } from "../api/booking-status-labels";

/**
 * A server component — the URL holds the filter state, so there is nothing to
 * keep in sync and no client bundle to ship. `next/form` with a string action
 * gives native GET semantics (so it works with JavaScript off) plus
 * client-side navigation when JS is available.
 */
export function BookingFiltersForm({
  active,
  view,
  services,
  toDateValue,
  fromDateValue,
}: {
  active: BookingFilters;
  view: BookingView;
  services: { slug: string; name: string }[];
  fromDateValue: string;
  toDateValue: string;
}) {
  const hasFilters = Object.keys(active).length > 0;

  /**
   * Only the statuses this tab can actually show.
   *
   * The tab already picks a set of statuses and the filter narrows within it,
   * so offering "Cancelled" on the Requests tab offers a choice whose only
   * possible outcome is an empty list. Worse, it used to *appear* to work —
   * the view's status silently overwrote the filter, so the page came back
   * looking exactly as before and the control seemed simply dead.
   *
   * Requests can only ever be REQUESTED, so the control is dropped entirely
   * there rather than shown with one option.
   */
  const statusOptions = VIEW_STATUSES[view] ?? Object.values(BookingStatus);
  const showStatus = statusOptions.length > 1;

  return (
    <Form action="" className="border-border flex flex-wrap items-end gap-3 rounded-lg border p-4">
      {/* Filtering must not silently drop you back to the default view. */}
      <input type="hidden" name="view" value={view} />

      {/*
       * Keyed so the inputs remount whenever the active filters change.
       * next/form navigates client-side, which leaves the DOM nodes in place —
       * so without this, "Clear filters" would empty the URL and the list
       * while the boxes still showed the old text. The key cannot go on <Form>
       * itself: it is unsupported there when the action is a string.
       */}
      <div key={JSON.stringify(active)} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">Search</span>
          <input
            name="q"
            defaultValue={active.q ?? ""}
            // One box across three columns: a receptionist with someone on the
            // phone has one identifier and does not know which field it is in.
            placeholder="name, email or phone"
            className={FIELD}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">Treatment</span>
          <select name="service" defaultValue={active.serviceSlug ?? ""} className={FIELD}>
            <option value="">Any</option>
            {services.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name}
              </option>
            ))}
          </select>
        </label>

        {showStatus && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground font-medium">Status</span>
            <select name="status" defaultValue={active.status ?? ""} className={FIELD}>
              <option value="">Any</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {STAFF_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">From</span>
          <input type="date" name="from" defaultValue={fromDateValue} className={FIELD} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">To</span>
          <input type="date" name="to" defaultValue={toDateValue} className={FIELD} />
        </label>
      </div>

      <Button type="submit" size="sm">
        Filter
      </Button>

      {hasFilters && (
        // A Link, not type="reset". Reset restores each field's defaultValue
        // without navigating, so the URL — and therefore the list — would not
        // change at all.
        <Link
          href={`/dashboard/bookings?view=${view}`}
          className="text-muted-foreground hover:text-foreground px-2 py-2 text-sm underline underline-offset-4"
        >
          Clear filters
        </Link>
      )}
    </Form>
  );
}
