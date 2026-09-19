import { ChevronDown } from "lucide-react";
import type { Faq } from "@/config/schema/practice-area.schema";
import { serialiseJsonLd } from "@/lib/structured-data";

type FaqAccordionProps = {
  faqs: Faq[];
  /** Emit FAQPage JSON-LD. Only one block per page may do this. */
  emitJsonLd?: boolean;
};

/**
 * The FAQs, as native `<details>`.
 *
 * Deliberately not a JS accordion. `<details>` is keyboard-operable, screen-reader
 * -announced and Ctrl+F-findable for free, and - the part that matters for a
 * page whose whole purpose is being found - the answers are in the DOM whether
 * or not they are open, so a crawler reads all three. A JS accordion that mounts
 * its panels on click would hide the most search-relevant copy on the page.
 *
 * The one thing `<details>` does not give us is exclusivity, and that is fine:
 * someone comparing two answers should be able to have both open.
 */
export function FaqAccordion({ faqs, emitJsonLd = false }: FaqAccordionProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      {emitJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serialiseJsonLd(jsonLd) }}
        />
      )}

      <div className="divide-border border-border divide-y border-t border-b">
        {faqs.map((faq) => (
          <details key={faq.question} className="group">
            <summary className="focus-visible:ring-ring/50 flex cursor-pointer list-none items-start justify-between gap-4 py-4 marker:content-none focus-visible:ring-3 focus-visible:outline-none pointer-coarse:min-h-11">
              <h3 className="text-foreground font-medium">{faq.question}</h3>
              <ChevronDown
                aria-hidden
                className="text-muted-foreground mt-0.5 size-5 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="text-muted-foreground pb-5 leading-relaxed">{faq.answer}</p>
          </details>
        ))}
      </div>
    </>
  );
}
