import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { PracticeAreaIcon } from "@/components/blocks/practice-area-icon";
import { SectionHeading } from "@/components/blocks/section";
import { CARD_SURFACE_INTERACTIVE } from "@/components/ui/card-surface";
import { AUDIENCE_SEGMENT } from "@/config/content/practice-areas";
import type { ResolvedPracticeArea, ResolvedService } from "@/features/practice-areas";
import { cn } from "@/lib/utils";

type FeaturedStripProps = {
  items: { area: ResolvedPracticeArea; service: ResolvedService }[];
};

/**
 * What the firm has chosen to promote, from /dashboard/practice-areas.
 *
 * Renders nothing when nothing is featured - the same rule the gallery block
 * follows. A heading over an empty row reads as a loading failure rather than
 * as an absence, and "nothing is promoted this month" is a perfectly ordinary
 * state for a firm that has not touched the CMS.
 *
 * This is the half of `featured` that makes the flag mean something. A checkbox
 * that only shows a badge in the admin table would be a preference the site
 * never acts on.
 */
export function FeaturedStrip({ items }: FeaturedStripProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="featured" className="border-border bg-secondary border-b">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <SectionHeading
          eyebrow="Frequently asked about"
          title="What people are asking about"
          lead="The matters the firm is fielding most often right now."
        />

        <ul className="mt-10 grid gap-5 sm:grid-cols-3">
          {items.slice(0, 6).map(({ area, service }, index) => (
            <li key={service.slug}>
              <Reveal delay={index * 0.08} className="h-full">
                <Link
                  href={`/${AUDIENCE_SEGMENT[area.audience]}/${area.slug}/${service.slug}`}
                  className={cn(CARD_SURFACE_INTERACTIVE, "group flex h-full flex-col p-5")}
                >
                  <span className="bg-secondary text-primary flex size-9 items-center justify-center rounded-md">
                    <PracticeAreaIcon name={service.icon} className="size-4.5" />
                  </span>
                  <h3 className="text-card-foreground mt-4 font-semibold tracking-tight">
                    {service.name}
                  </h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {service.summary}
                  </p>
                  <span className="text-primary mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium">
                    Read more
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                    <span className="sr-only"> about {service.name}</span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
