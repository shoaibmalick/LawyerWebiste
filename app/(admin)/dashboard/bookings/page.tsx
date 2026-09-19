import { services } from "@/config/content/services";
import {
  BookingFiltersForm,
  BookingList,
  BookingViewTabs,
  getFollowUpWindow,
  hasBookingFilters,
  listAllBookings,
  listBookingsForFollowUp,
  parseBookingFilters,
  parseBookingView,
  type BookingRow,
} from "@/features/booking";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

const HEADINGS: Record<string, string> = {
  requests: "Requests waiting to be confirmed",
  followup: "Coming up — who to call",
  upcoming: "Upcoming appointments",
  all: "All bookings",
};

/**
 * Describes what is on screen, in every combination. Always rendered, never
 * conditional — the old copy only appeared when the total exceeded the page
 * size, so a filter matching three of four hundred printed nothing at all.
 */
function summarise(shown: number, matching: number, total: number, filtered: boolean): string {
  if (!filtered) {
    return matching > shown
      ? `Showing the first ${shown} of ${matching}.`
      : `${matching} ${matching === 1 ? "booking" : "bookings"}.`;
  }
  if (matching > shown) {
    return `Showing the first ${shown} of ${matching} matching bookings (${total} in total).`;
  }
  return `${matching} of ${total} bookings match these filters.`;
}

type Row = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  serviceSlug: string;
  status: BookingRow["status"];
  paid: boolean;
  slot: { startsAt: Date };
};

/**
 * The service lookup and the time formatting both stay on the server:
 * config/content/services.ts and the business timezone have no business in the
 * browser bundle, and preformatting rules out a hydration mismatch. Bookings
 * keep the full date *and time* — an appointment's time is the whole point.
 */
function toRow(booking: Row): BookingRow {
  const service = services.find((candidate) => candidate.slug === booking.serviceSlug);
  return {
    id: booking.id,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    serviceName: service?.name ?? booking.serviceSlug,
    startsAtLabel: formatDateTime(booking.slot.startsAt),
    status: booking.status,
    paid: booking.paid,
    tracksPayment: Boolean(service?.depositAmount),
  };
}

export default async function BookingsPage({
  searchParams,
}: {
  // Next 16 made searchParams a Promise. Annotated explicitly rather than via
  // the generated PageProps helper — .next/types does not exist on a clean
  // checkout and would break typecheck before the first build.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Middleware is a redirect convenience, not the gate. proxy.ts matches
  // /dashboard/:path* and redirects, but Next.js has a documented
  // middleware-authorisation-bypass class (CVE-2025-29927) and a matcher is a
  // routing rule rather than a property of this page. requireAdmin asserts
  // role === "admin", so a signed-in *customer* — a valid session on the same
  // Auth.js instance — fails it here even if it reached this far.
  await requireAdmin();
  const params = await searchParams;
  const view = parseBookingView(params.view);
  const filters = parseBookingFilters(
    params,
    services.map((service) => service.slug),
  );
  const filtered = hasBookingFilters(filters);

  const followUpDays = await getFollowUpWindow();

  // Both are needed on every view: the list itself, and the whole-table counts
  // that drive the tab labels.
  const [list, followUp] = await Promise.all([
    listAllBookings(filters, view),
    // Filters go in here too. They used not to, which is why every control on
    // the Follow-up tab did nothing at all.
    listBookingsForFollowUp(followUpDays, filters),
  ]);

  const counts = {
    requests: list.statusCounts.REQUESTED,
    // tabTotal, not the filtered totals — a tab label counts the whole table,
    // the same way the other three do.
    followUp: followUp.tabTotal,
    upcoming:
      list.statusCounts.REQUESTED + list.statusCounts.CONFIRMED + list.statusCounts.PENDING_PAYMENT,
    all: list.statusCounts.all,
  };

  const dateValue = (value: Date | undefined) =>
    value ? new Date(value).toISOString().slice(0, 10) : "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {HEADINGS[view] ?? "Bookings"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A booking made on the website is a request until someone rings the patient and confirms
          it. It still holds the chair in the meantime.
        </p>
      </div>

      <BookingViewTabs active={view} counts={counts} followUpDays={followUpDays} />

      <BookingFiltersForm
        active={filters}
        view={view}
        services={services.map((service) => ({ slug: service.slug, name: service.name }))}
        fromDateValue={dateValue(filters.from)}
        toDateValue={dateValue(filters.to)}
      />

      {view === "followup" ? (
        <>
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-foreground text-lg font-medium">
                Needs a call before it happens
              </h2>
              <p className="text-muted-foreground text-sm">
                Nobody has confirmed these with the patient yet.
              </p>
            </div>
            <BookingList
              bookings={followUp.needsCall.map(toRow)}
              emptyMessage={`No unconfirmed appointments in the next ${followUpDays} days.`}
            />
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-foreground text-lg font-medium">Confirmed and coming up</h2>
              <p className="text-muted-foreground text-sm">
                A reminder call, if you make them. Nothing here needs action.
              </p>
            </div>
            <BookingList
              bookings={followUp.upcoming.map(toRow)}
              emptyMessage={`Nothing confirmed in the next ${followUpDays} days.`}
            />
          </section>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {summarise(list.bookings.length, list.matching, list.total, filtered)}
          </p>
          <BookingList
            bookings={list.bookings.map(toRow)}
            emptyMessage={
              filtered
                ? "No bookings match these filters."
                : view === "requests"
                  ? "No requests waiting — everything has been called."
                  : "No bookings yet."
            }
          />
        </>
      )}
    </div>
  );
}
