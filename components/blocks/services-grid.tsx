import type { ReactNode } from "react";
import { formatMajorUnits } from "@/lib/money";
import { Reveal } from "@/components/motion/reveal";
import { CARD_SURFACE_INTERACTIVE } from "@/components/ui/card-surface";
import { cn } from "@/lib/utils";
import { bookingCardHref, groupServicesByCategory, slugifyCategory } from "@/lib/services";
import Image from "next/image";

import type { Service } from "@/config/schema/content.schema";

type ServicesGridProps = {
  services: Service[];
  /**
   * Overrides for a business whose bookable list is not called "Services".
   *
   * Same arrangement `Booking` already has, and for the same reason: a law
   * firm's bookable list is four kinds of consultation, and its *services* are
   * the forty-eight practice areas elsewhere on the site. Rendering a heading
   * that says "Services" over the consultation types makes the page claim the
   * firm does four things.
   */
  title?: string;
  deck?: string;
  /** Rendered under the grid - a link on to the full booking page, typically. */
  footer?: ReactNode;
  /**
   * The route the `Booking` block renders on, which the cards link into.
   *
   * Defaults to `"/"` - the single-page arrangement, where booking sits on the
   * homepage. A site that gives booking its own route has to say so, because
   * the block cannot see where its destination ended up: see `bookingCardHref`
   * in lib/services.ts for what happened when this was hardcoded.
   *
   * A prop rather than a config lookup, for the same reason `title` and `deck`
   * are: /components/blocks never reads a specific client's data.
   */
  bookingHref?: string;
};

/**
 * The services a visitor can book, as cards.
 *
 * Each card links into the booking form with that service preselected. That is
 * not a new capability: `BookingForm` already reads `?service=` from the query,
 * checks it against the bookable list, sets the dropdown and scrolls itself
 * into view — with a comment explaining why it has to scroll manually.
 *
 * Nothing on the site ever produced that link. These were plain `<div>`s, so
 * the whole mechanism was unreachable and the grid looked clickable while doing
 * nothing. Somebody who reads a service, decides on it and clicks got no
 * response of any kind, which reads as a broken page rather than as a card that
 * happens not to be a link.
 *
 * Both parts of the href earn their place: `?service=` is what the form reads,
 * and `#booking` is what gets the visitor to the form — including when the
 * query names something this client does not offer online, which the form
 * ignores deliberately.
 *
 * A plain anchor rather than next/link, and that is a decision rather than an
 * oversight. It is the one shape that is correct whichever route `bookingHref`
 * names. When the grid and the form share a page, a `<Link>` differing only in
 * the query left the address bar on `/` with the dropdown unset — measured in
 * a browser, not assumed; the preselect needs a navigation that actually
 * carries the query, and a document load is one. When they are on different
 * routes a `<Link>` would work, but buys little: the destination is
 * `force-dynamic` and reads live availability, so there is no prerendered
 * payload for it to prefetch. Either way a document load lets the browser
 * honour `#booking` itself rather than depending on the form scrolling itself
 * into view.
 *
 * The cost is a page load on a marketing page, which is the cheaper half of
 * the trade. The alternative was a card that looks clickable and does nothing,
 * which is what shipped before.
 */
export function ServicesGrid({
  services,
  title = "Services",
  deck,
  footer,
  bookingHref = "/",
}: ServicesGridProps) {
  return (
    <section id="services" className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <h2 className="text-foreground text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {deck && <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">{deck}</p>}
      {groupServicesByCategory(services).map((group) => {
        // The card title is one level below whatever precedes it. With a
        // category heading that is an h4; without one the h2 above is the
        // nearest ancestor, so it stays an h3. Skipping a level would make the
        // page's outline unusable to a screen reader for the sake of a font
        // size that is set by className anyway.
        const CardTitle = group.category ? "h4" : "h3";

        return (
          <div key={group.category ?? "__uncategorised"} className="mt-12 first:mt-10">
            {group.category && (
              <h3
                id={slugifyCategory(group.category)}
                className="text-foreground scroll-mt-24 text-xl font-medium tracking-tight"
              >
                {group.category}
              </h3>
            )}
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {group.services.map((service, index) => {
                /*
                 * The free consultation is emphasised, and it keeps its ring at
                 * rest rather than only on hover. Without that, the hover border
                 * colour would overwrite the emphasis and the highlighted card
                 * would look *less* prominent under the pointer than beside it.
                 */
                const featured = service.priceFrom === 0;

                return (
                  <Reveal key={service.slug} delay={index * 0.08} className="h-full">
                    <a
                      href={bookingCardHref(bookingHref, service.slug)}
                      className={cn(
                        CARD_SURFACE_INTERACTIVE,
                        "block h-full overflow-hidden",
                        featured && "border-primary ring-primary/20 hover:border-primary ring-2",
                      )}
                    >
                      {service.image && (
                        // Decorative: the service name and description directly below
                        // carry the meaning, so an empty alt avoids a redundant readout.
                        <div className="bg-muted relative aspect-video w-full">
                          <Image
                            src={service.image}
                            alt=""
                            fill
                            sizes="(min-width: 640px) 50vw, 100vw"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-baseline justify-between gap-3">
                          <CardTitle className="text-foreground text-lg font-semibold tracking-tight">
                            {service.name}
                          </CardTitle>
                          {featured && (
                            <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
                              Start here
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                          {service.description}
                        </p>
                        <div className="text-muted-foreground mt-4 flex items-center justify-between text-sm">
                          <span>{service.durationMinutes} min</span>
                          {service.priceFrom !== undefined && (
                            <span>
                              {service.priceFrom === 0
                                ? "Free"
                                : `From ${formatMajorUnits(service.priceFrom)}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  </Reveal>
                );
              })}
            </div>
          </div>
        );
      })}
      {footer && <div className="mt-10">{footer}</div>}
    </section>
  );
}
