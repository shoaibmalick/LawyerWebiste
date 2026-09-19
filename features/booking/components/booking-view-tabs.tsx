import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BookingView } from "@/server/services/bookingService";

type Counts = { requests: number; followUp: number; upcoming: number; all: number };

/**
 * Links rather than a form: four fixed destinations, so each is a real URL that
 * can be bookmarked and opened in a new tab, and none of it needs JavaScript.
 *
 * The counts double as feedback — confirm a request and watch Requests drop.
 */
export function BookingViewTabs({
  active,
  counts,
  followUpDays,
}: {
  active: BookingView;
  counts: Counts;
  followUpDays: number;
}) {
  const tabs = [
    {
      view: "requests" as const,
      label: "Requests",
      count: counts.requests,
      href: "/dashboard/bookings",
    },
    {
      view: "followup" as const,
      label: `Follow-up (${followUpDays}d)`,
      count: counts.followUp,
      href: "/dashboard/bookings?view=followup",
    },
    {
      view: "upcoming" as const,
      label: "Upcoming",
      count: counts.upcoming,
      href: "/dashboard/bookings?view=upcoming",
    },
    { view: "all" as const, label: "All", count: counts.all, href: "/dashboard/bookings?view=all" },
  ];

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Filter bookings">
      {tabs.map((tab) => {
        const isActive = tab.view === active;
        return (
          <Link
            key={tab.view}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "border-border bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent",
            )}
          >
            {tab.label} ({tab.count})
          </Link>
        );
      })}
    </nav>
  );
}
