import type { Metadata } from "next";
import Link from "next/link";
import { DemoDisclaimer } from "@/components/blocks/demo-disclaimer";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/blocks/section";
import { PageHeader } from "@/components/blocks/page-header";
import { buttonVariants } from "@/components/ui/button";
import { listPracticeAreas } from "@/config/content/practice-areas";
import { siteConfig } from "@/config/site.config";

export const metadata: Metadata = {
  title: "About Harbourline Law Group",
  description:
    "A cross-border firm with lawyers in Toronto and New York, advising businesses and individuals whose lives and operations do not stop at the border.",
  alternates: { canonical: "/about" },
};

const PILLARS = [
  {
    heading: "One file, not two",
    body: "A cross-border matter handled by two unconnected firms becomes two matters, and the gap between them is where the problem lives. Our Toronto and New York lawyers work the same file, so a Delaware parent and a CBCA subsidiary are designed together rather than reconciled after closing.",
  },
  {
    heading: "The border is the first question, not the last",
    body: "A guilty plea that looks routine in one country can make you inadmissible to the other for years, and a US expungement does not cure Canadian inadmissibility. We ask about the border at the start of a matter, when the answer can still change the strategy.",
  },
  {
    heading: "Plain answers about cost",
    body: "We will tell you how a matter is billed - contingency, flat fee, or hourly against a retainer - before you decide anything. What we will not do is quote a number from a web form, because the number depends on facts nobody has heard yet.",
  },
];

export default function AboutPage() {
  const business = listPracticeAreas("business").length;
  const individual = listPracticeAreas("individual").length;

  return (
    <main className="flex-1">
      <PageHeader
        eyebrow="About the firm"
        title="Counsel that crosses the border with you"
        deck={`${siteConfig.business.legalName} advises companies and individuals whose lives and operations do not stop at the Canada-US border. ${business} business practice areas, ${individual} personal ones, and lawyers qualified on both sides.`}
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      {/*
        The firm in four numbers, before the prose.
        A <dl> rather than a grid of divs: these are label/value pairs, and the
        markup should say so for anyone not reading them visually.
      */}
      <Section tone="muted" className="border-border border-b">
        <dl className="grid gap-8 sm:grid-cols-4">
          {[
            { value: "2", label: "Offices", detail: "Toronto and New York" },
            { value: "2", label: "Countries", detail: "Canadian and US law" },
            {
              value: String(business + individual),
              label: "Practice areas",
              detail: "Across both audiences",
            },
            { value: "6", label: "Partners", detail: "Qualified in ON, QC and NY" },
          ].map((stat, index) => (
            /*
             * No extra <div> inside the Reveal. `Reveal` already renders one,
             * and the spec allows a <dl> to contain <div> wrappers around
             * dt/dd groups — but only one level. Nesting a second put the
             * <dt> two divs deep and broke the list semantics; axe caught it
             * as `definition-list` + `dlitem`.
             */
            <Reveal key={stat.label} delay={index * 0.08}>
              <dt className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
                {stat.label}
              </dt>
              <dd className="text-foreground mt-2 text-4xl font-semibold tracking-tight">
                {stat.value}
              </dd>
              <dd className="text-muted-foreground mt-1 text-sm">{stat.detail}</dd>
            </Reveal>
          ))}
        </dl>
      </Section>

      <Section width="narrow">
        <SectionHeading
          eyebrow="How we work"
          title="Three things we do differently"
          lead="Not claims about outcomes - those we cannot make. Claims about method, which you can hold us to."
        />

        <div className="mt-10 space-y-10">
          {PILLARS.map((pillar, index) => (
            <Reveal key={pillar.heading} delay={index * 0.08}>
              <div>
                <h3 className="text-foreground text-xl font-semibold tracking-tight text-balance">
                  {pillar.heading}
                </h3>
                <p className="text-muted-foreground mt-3 leading-relaxed text-pretty">
                  {pillar.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <section className="border-border mt-14 rounded-lg border p-6">
            <h2 className="text-foreground text-lg font-semibold tracking-tight">Where we are</h2>
            <dl className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-primary text-sm font-semibold">Toronto</dt>
                <dd className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {siteConfig.business.address.street}
                  <br />
                  {siteConfig.business.address.city}, {siteConfig.business.address.state}{" "}
                  {siteConfig.business.address.zip}
                </dd>
              </div>
              <div>
                <dt className="text-primary text-sm font-semibold">New York</dt>
                <dd className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  By appointment
                  <br />
                  New York, NY
                </dd>
              </div>
            </dl>
          </section>
        </Reveal>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/contact" className={buttonVariants()}>
            Get in touch
          </Link>
          <Link href="/consultation" className={buttonVariants({ variant: "outline" })}>
            Book a consultation
          </Link>
        </div>

        <DemoDisclaimer variant="inline" className="mt-12" />
      </Section>
    </main>
  );
}
