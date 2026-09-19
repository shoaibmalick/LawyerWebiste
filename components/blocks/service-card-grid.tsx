import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { JurisdictionBadges } from "@/components/blocks/jurisdiction-badge";
import { PracticeAreaIcon } from "@/components/blocks/practice-area-icon";
import { CARD_SURFACE_INTERACTIVE } from "@/components/ui/card-surface";
import { servicePath } from "@/config/content/practice-areas";
import type { LegalService, PracticeArea } from "@/config/schema/practice-area.schema";
import { cn } from "@/lib/utils";

type ServiceCardGridProps = {
  area: PracticeArea;
  services: LegalService[];
  /** Tighter cards, used for the three related services at the foot of a page. */
  compact?: boolean;
};

/**
 * Service cards within one category.
 *
 * `summary` is the only copy here, which is why the schema caps it and the
 * content files were written to make it stand alone: nobody scanning a grid
 * reads a description, and a summary that only makes sense after the heading
 * above it has already failed.
 */
export function ServiceCardGrid({ area, services, compact = false }: ServiceCardGridProps) {
  return (
    <ul className={compact ? "grid gap-4 sm:grid-cols-3" : "grid gap-5 sm:grid-cols-2"}>
      {services.map((service, index) => (
        <li key={service.slug}>
          <Reveal delay={index * 0.08} className="h-full">
            <Link
              href={servicePath(area, service)}
              className={cn(CARD_SURFACE_INTERACTIVE, "group flex h-full flex-col p-5")}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="bg-secondary text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                  <PracticeAreaIcon name={service.icon} className="size-4.5" />
                </span>
                {!compact && <JurisdictionBadges jurisdictions={service.jurisdictions} />}
              </div>

              <h3 className="text-card-foreground mt-4 font-semibold tracking-tight">
                {service.name}
              </h3>

              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
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
  );
}
