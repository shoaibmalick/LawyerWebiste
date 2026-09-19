import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { PracticeAreaIcon } from "@/components/blocks/practice-area-icon";
import { Section, SectionHeading } from "@/components/blocks/section";
import { AUDIENCE_SEGMENT, listPracticeAreas } from "@/config/content/practice-areas";
import type { Audience } from "@/config/schema/practice-area.schema";

/**
 * The two doors.
 *
 * This is the only decision the homepage asks a visitor to make, and everything
 * else on the site hangs off it. A firm serving both a general counsel and
 * somebody who was hit by a car has two audiences with nothing in common: the
 * language that reassures one puts the other off. So rather than a single
 * services grid averaging across both, the page forks immediately and each half
 * gets to speak plainly.
 *
 * Each panel lists its six categories rather than just naming the audience.
 * Someone arriving with "my builder has put a lien on my house" does not know
 * that lives under Real Estate & Construction, and a door labelled only "For
 * Business" makes them guess.
 */

const PANELS: Record<Audience, { title: string; body: string; cue: string }> = {
  business: {
    title: "For business",
    body: "Incorporating, contracting, hiring, protecting what you invent, holding property, and defending the company when something goes wrong.",
    cue: "Founders, general counsel and CFOs",
  },
  individual: {
    title: "For individuals and families",
    body: "Injury, family breakdown, estates, criminal charges, buying and selling a home, and moving between the two countries.",
    cue: "When something in your life has gone wrong",
  },
};

export function AudienceSplit() {
  return (
    <Section tone="ink">
      <SectionHeading
        tone="ink"
        eyebrow="Two practices, one firm"
        title="Who are we helping?"
        lead="The two halves of the firm work differently. Start with the one that fits."
      />

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {(Object.keys(PANELS) as Audience[]).map((audience, index) => {
          const panel = PANELS[audience];
          const areas = listPracticeAreas(audience);
          const href = `/${AUDIENCE_SEGMENT[audience]}`;

          return (
            <Reveal key={audience} delay={index * 0.08} className="h-full">
              <div className="border-ink-muted/25 bg-ink-foreground/5 hover:border-ink-muted/45 flex h-full flex-col rounded-lg border p-6 transition-colors duration-200">
                <p className="text-accent-on-ink text-xs font-semibold tracking-wide uppercase">
                  {panel.cue}
                </p>
                <h3 className="text-ink-foreground mt-2 text-xl font-semibold tracking-tight">
                  {panel.title}
                </h3>
                <p className="text-ink-muted mt-3 text-sm leading-relaxed">{panel.body}</p>

                <ul className="mt-5 space-y-2 text-sm">
                  {areas.map((area) => (
                    <li key={area.slug} className="flex items-center gap-2.5">
                      <PracticeAreaIcon
                        name={area.icon}
                        className="text-accent-on-ink size-4 opacity-80"
                      />
                      <span className="text-ink-foreground/90">{area.name}</span>
                    </li>
                  ))}
                </ul>

                {/*
                  The whole panel is not a link. It contains a list of six things
                  a visitor may want to read, and wrapping all of that in one
                  anchor would make every item announce the same destination.
                */}
                <Link
                  href={href}
                  className="text-accent-on-ink hover:text-ink-foreground focus-visible:ring-ring/50 group mt-6 inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:outline-none pointer-coarse:min-h-11"
                >
                  {panel.title}
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
