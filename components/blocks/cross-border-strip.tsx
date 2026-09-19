import { ArrowLeftRight, CircleAlert, FileWarning } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/blocks/section";

/**
 * Three concrete examples of the thing the firm claims to be good at.
 *
 * "Cross-border expertise" is what every firm's homepage says. What makes it
 * mean anything is naming a trap a reader can check: a US expungement that does
 * not cure Canadian inadmissibility is either true or it is not, and someone who
 * has been told otherwise now has a reason to call.
 *
 * All three are drawn from the practice-area content rather than invented here,
 * so the claim on the homepage and the explanation on the service page cannot
 * drift apart.
 */

const POINTS = [
  {
    icon: CircleAlert,
    heading: "A clean record on one side is not clean on the other",
    body: "A US expungement does not cure Canadian inadmissibility, and a Canadian impaired-driving conviction can keep you out of the United States. Relief exists, but it takes months - which is why the border belongs in the defence strategy from day one, not after sentencing.",
  },
  {
    icon: FileWarning,
    heading: "US-drafted paperwork quietly fails in Canada",
    body: "Canada has no equivalent of the Defend Trade Secrets Act, and moral rights must be expressly waived rather than assigned. An IP assignment that works perfectly in Delaware can leave a Canadian contractor holding rights the buyer thought they had bought.",
  },
  {
    icon: ArrowLeftRight,
    heading: "The same estate plan can create the tax it was meant to avoid",
    body: "A US revocable living trust can trigger Canadian tax rather than shelter it, and Canadians holding US-situs assets can face US estate tax. The structures that work are different ones - alter ego trusts, secondary wills, treaty relief.",
  },
] as const;

export function CrossBorderStrip() {
  return (
    <Section className="border-border border-b">
      <SectionHeading
        eyebrow="Cross-border practice"
        title="Where the border actually bites"
        lead="Three things we see people find out too late."
      />

      <ul className="mt-10 grid gap-8 sm:grid-cols-3">
        {POINTS.map((point, index) => (
          <li key={point.heading}>
            <Reveal delay={index * 0.08}>
              <point.icon aria-hidden className="text-primary size-6" strokeWidth={1.75} />
              <h3 className="text-foreground mt-4 text-lg font-semibold tracking-tight text-balance">
                {point.heading}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{point.body}</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
