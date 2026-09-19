import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/blocks/section";
import { LeadForm, PRACTICE_AREA_OPTIONS } from "@/features/leads";
import type { SiteConfig } from "@/config/schema/site.schema";

type ContactFormProps = {
  business: SiteConfig["business"];
};

/**
 * The enquiry form, at the foot of the homepage.
 *
 * It sits **last** on purpose. The hero asks for one thing — book a
 * consultation — and a form competing with that above the fold would split the
 * page's ask in two. Down here it catches the reader who has scrolled the whole
 * page, decided they are interested, and does not want to book a time before
 * describing the problem. Those are different people and the page can serve
 * both as long as it does so in order.
 *
 * On the `ink` band so it reads as the page's closing move rather than as one
 * more section, and because the footer directly beneath it is light — two light
 * bands in a row would let the page end without a full stop.
 */
export function ContactForm({ business }: ContactFormProps) {
  return (
    <Section tone="ink" id="contact">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <SectionHeading
            tone="ink"
            eyebrow="Start here"
            title="Tell us what you are dealing with"
            lead="We will say whether we can help and what the next step looks like. The first conversation is free and carries no obligation."
          />

          <Reveal delay={0.08}>
            <dl className="mt-8 flex flex-col gap-4 text-sm">
              <div>
                <dt className="text-ink-muted">Rather speak to someone?</dt>
                <dd className="mt-1">
                  <a
                    href={`tel:${business.phone}`}
                    className="text-ink-foreground hover:text-accent-on-ink focus-visible:ring-ring/50 inline-flex min-h-6 items-center rounded-sm font-mono underline-offset-4 transition-colors hover:underline focus-visible:ring-3 focus-visible:outline-none"
                  >
                    {business.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Know the time you want?</dt>
                <dd className="mt-1">
                  <Link
                    href="/consultation"
                    className="text-ink-foreground hover:text-accent-on-ink focus-visible:ring-ring/50 inline-flex min-h-6 items-center rounded-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:ring-3 focus-visible:outline-none"
                  >
                    Book a consultation instead
                  </Link>
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>

        {/*
          The form sits on a lifted card rather than directly on the band.
          Input borders and placeholder text are tuned for the light palette;
          dropped straight onto ink they would need a parallel set of dark-mode
          field styles, which is a lot of surface area to maintain for one
          block. A light card keeps every form on the site identical.
        */}
        <Reveal delay={0.12}>
          {/*
            `text-foreground` is not decoration - it resets an inherited colour.

            The Section sets `text-ink-foreground` on the whole band. This card
            sets its own background but, without this, inherits that near-white
            text - so every input rendered white-on-white and anything typed into
            the form was invisible. Measured at 1.06:1.

            axe did not catch it and could not: the inputs are empty, and there
            is no text to measure the contrast of until somebody types. Any block
            that puts a light surface inside a dark band has to restate the text
            colour as well as the background.
          */}
          <div className="bg-background text-foreground border-border rounded-lg border p-6 sm:p-8">
            <LeadForm layout="wide" practiceAreas={PRACTICE_AREA_OPTIONS} />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
