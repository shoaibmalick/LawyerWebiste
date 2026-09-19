import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { PracticeAreaIcon } from "@/components/blocks/practice-area-icon";
import { CARD_SURFACE_INTERACTIVE } from "@/components/ui/card-surface";
import { practiceAreaPath } from "@/config/content/practice-areas";
import type { PracticeArea } from "@/config/schema/practice-area.schema";
import { cn } from "@/lib/utils";

type PracticeAreaGridProps = {
  areas: PracticeArea[];
};

/**
 * The six category cards on an audience hub.
 *
 * Each card names its four services rather than only the category. A visitor
 * arriving with a specific problem - "my builder has put a lien on my house" -
 * does not know it lives under "Real Estate & Construction", and a grid of six
 * abstractions makes them guess. Listing the services means the page answers
 * with the words they would use, and the extra height costs one scroll.
 */
export function PracticeAreaGrid({ areas }: PracticeAreaGridProps) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {areas.map((area, index) => (
        <li key={area.slug}>
          <Reveal delay={index * 0.08} className="h-full">
            <Link
              href={practiceAreaPath(area)}
              className={cn(CARD_SURFACE_INTERACTIVE, "group flex h-full flex-col p-6")}
            >
              <div className="flex items-center gap-3">
                <span className="bg-secondary text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
                  <PracticeAreaIcon name={area.icon} />
                </span>
                <h2 className="text-card-foreground text-lg font-semibold tracking-tight">
                  {area.name}
                </h2>
              </div>

              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{area.tagline}</p>

              <ul className="text-muted-foreground mt-4 space-y-1.5 text-sm">
                {area.services.map((service) => (
                  <li key={service.slug} className="flex gap-2">
                    <span aria-hidden className="text-accent">
                      &middot;
                    </span>
                    {service.name}
                  </li>
                ))}
              </ul>

              <span className="text-primary mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                Explore {area.name}
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
