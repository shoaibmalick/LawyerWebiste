import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReviewStatusView } from "../schema/moderation.schema";

type Counts = { PENDING: number; APPROVED: number; HIDDEN: number; all: number };

/**
 * Links rather than a form or a select: four fixed destinations, so each is a
 * real URL that can be bookmarked, opened in a new tab and prefetched — and
 * none of it needs JavaScript.
 *
 * The counts are not decoration. They are the second half of the feedback loop
 * for a moderation action: publish a review and you watch Pending go down as
 * Published goes up, which confirms the change landed even before you read the
 * status line.
 */
export function ReviewStatusTabs({ active, counts }: { active: ReviewStatusView; counts: Counts }) {
  const tabs = [
    {
      view: "PENDING" as const,
      label: "Pending",
      count: counts.PENDING,
      href: "/dashboard/reviews",
    },
    {
      view: "APPROVED" as const,
      label: "Published",
      count: counts.APPROVED,
      href: "/dashboard/reviews?status=approved",
    },
    {
      view: "HIDDEN" as const,
      label: "Hidden",
      count: counts.HIDDEN,
      href: "/dashboard/reviews?status=hidden",
    },
    {
      view: "ALL" as const,
      label: "All",
      count: counts.all,
      href: "/dashboard/reviews?status=all",
    },
  ];

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Filter reviews by status">
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
