import type { Jurisdiction } from "@/config/schema/practice-area.schema";
import { cn } from "@/lib/utils";

const LABELS: Record<Jurisdiction, { short: string; full: string }> = {
  CA: { short: "Canada", full: "Advises on Canadian law" },
  US: { short: "United States", full: "Advises on United States law" },
};

type JurisdictionBadgesProps = {
  jurisdictions: Jurisdiction[];
  className?: string;
};

/**
 * Which side of the border a service covers.
 *
 * The single most useful fact on a card for this firm's visitors, and the one
 * thing a generic practice-area list never tells you. Someone with a Toronto
 * problem and a New York problem needs to know in one glance which of the two
 * this page is about - or, most often here, that it is about both.
 *
 * Rendered as a list with a visually-hidden label rather than bare pills: out
 * of context, "Canada" "United States" floating next to a heading is
 * meaningless to someone who cannot see that they are styled as tags.
 */
export function JurisdictionBadges({ jurisdictions, className }: JurisdictionBadgesProps) {
  // Canada first, consistently. The firm is Toronto-led and the order being
  // stable matters more than which way round it is.
  const ordered = [...jurisdictions].sort((a, b) => (a === "CA" ? -1 : b === "CA" ? 1 : 0));

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <li className="sr-only">Jurisdictions covered:</li>
      {ordered.map((code) => (
        <li
          key={code}
          title={LABELS[code].full}
          className="border-border bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
        >
          <span aria-hidden className="text-primary font-semibold">
            {code}
          </span>
          <span className="sr-only">{LABELS[code].short}</span>
        </li>
      ))}
    </ul>
  );
}
