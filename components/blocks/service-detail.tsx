import Link from "next/link";
import { Check } from "lucide-react";
import { DemoDisclaimer } from "@/components/blocks/demo-disclaimer";
import { FaqAccordion } from "@/components/blocks/faq-accordion";
import { ServiceCardGrid } from "@/components/blocks/service-card-grid";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { CARD_SURFACE } from "@/components/ui/card-surface";
import { findService, practiceAreaPath } from "@/config/content/practice-areas";
import type { LegalService, PracticeArea } from "@/config/schema/practice-area.schema";
import { cn } from "@/lib/utils";

type ServiceDetailProps = {
  area: PracticeArea;
  service: LegalService;
};

/**
 * The body of a service page.
 *
 * Order is deliberate and follows what someone with this problem actually
 * needs, in order: what it is, what we do about it, the questions they were
 * going to ask anyway, where to go next, and how to start. The CTA sits after
 * the FAQs rather than before because a visitor who has not had their questions
 * answered does not fill in a form.
 *
 * Related services come from `relatedSlugs`, which the generator derives as the
 * siblings in this category. They are resolved through `findService` rather
 * than read off `area.services` so that a future hand-authored cross-category
 * link keeps working without changing this component.
 *
 * ## The jump nav
 *
 * These pages run long — a description, four features, three FAQs, three
 * related cards and a CTA — and a reader who arrived from a search result for
 * one specific question should not have to scroll past everything else to find
 * it. Sticky on `lg` only: on a phone a fixed bar would eat the viewport the
 * article needs, so below that breakpoint it sits in flow and scrolls away.
 */
export function ServiceDetail({ area, service }: ServiceDetailProps) {
  const related = service.relatedSlugs
    .map((slug) => findService(slug))
    .filter((found): found is NonNullable<typeof found> => found !== undefined);

  const contactHref = `/contact?service=${encodeURIComponent(service.slug)}`;

  const jumpLinks = [
    { href: "#what-we-do", label: "What this includes" },
    { href: "#faqs", label: "Common questions" },
    ...(related.length > 0 ? [{ href: "#related", label: "Related services" }] : []),
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-24 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-16">
      <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
          On this page
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 lg:flex-col lg:gap-1">
          {jumpLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex min-h-6 items-center rounded-sm text-sm transition-colors duration-200 focus-visible:ring-3 focus-visible:outline-none"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        <Reveal>
          <p className="text-foreground text-lg leading-relaxed text-pretty">
            {service.description}
          </p>
        </Reveal>

        <section aria-labelledby="what-we-do" className="mt-14 scroll-mt-24">
          <Reveal>
            <h2
              id="what-we-do"
              className="text-foreground text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
            >
              What this includes
            </h2>
          </Reveal>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {service.keyFeatures.map((feature, index) => (
              <li key={feature}>
                <Reveal delay={index * 0.08} className="h-full">
                  <div
                    className={cn(CARD_SURFACE, "flex h-full gap-3 p-4 text-sm leading-relaxed")}
                  >
                    <Check aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
                    <span className="text-card-foreground">{feature}</span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faqs" className="mt-14 scroll-mt-24">
          <Reveal>
            <h2
              id="faqs"
              className="text-foreground mb-6 text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
            >
              Common questions
            </h2>
          </Reveal>
          <FaqAccordion faqs={service.faqs} emitJsonLd />
        </section>

        {related.length > 0 && (
          <section aria-labelledby="related" className="mt-14 scroll-mt-24">
            <Reveal>
              <h2
                id="related"
                className="text-foreground mb-6 text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
              >
                Related in {area.name}
              </h2>
            </Reveal>
            <ServiceCardGrid area={area} services={related.map((entry) => entry.service)} compact />
          </section>
        )}

        <Reveal>
          <section className="bg-ink text-ink-foreground mt-16 rounded-lg px-6 py-10 sm:px-10">
            <h2 className="text-ink-foreground text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {service.cta}
            </h2>
            <p className="text-ink-muted mt-3 leading-relaxed text-pretty">
              Tell us what you are dealing with. We will say whether we can help, and what the next
              step looks like.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={contactHref}
                className={cn(
                  buttonVariants({ variant: "onInk", size: "lg" }),
                  "transition-transform duration-200 motion-safe:hover:-translate-y-0.5",
                )}
              >
                Start a conversation
              </Link>
              <Link
                href={practiceAreaPath(area)}
                className={cn(
                  buttonVariants({ variant: "onInkOutline", size: "lg" }),
                  "transition-transform duration-200 motion-safe:hover:-translate-y-0.5",
                )}
              >
                All of {area.name}
              </Link>
            </div>
          </section>
        </Reveal>

        <DemoDisclaimer variant="inline" className="mt-12" />
      </div>
    </div>
  );
}
