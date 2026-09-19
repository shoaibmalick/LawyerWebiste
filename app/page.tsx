import Link from "next/link";
import { AudienceSplit } from "@/components/blocks/audience-split";
import { ContactForm } from "@/components/blocks/contact-form";
import { CrossBorderStrip } from "@/components/blocks/cross-border-strip";
import { FeaturedStrip } from "@/components/blocks/featured-strip";
import { FirmHero } from "@/components/blocks/firm-hero";
import { ServicesGrid } from "@/components/blocks/services-grid";
import { buttonVariants } from "@/components/ui/button";
import { services } from "@/config/content/services";
import { listFeatured } from "@/features/practice-areas";
import { getBusiness } from "@/features/site-settings";
import { isFeatureEnabled } from "@/lib/features";

/**
 * Reads the business record, which the owner edits at /dashboard/settings.
 * Live database state, so this must not prerender as static.
 */
export const dynamic = "force-dynamic";

/**
 * The homepage, rebuilt for a law firm.
 *
 * What is gone from the kit's version and why:
 *
 * - `HeroCinematic` -> `FirmHero`. No photography, and no stock photograph of
 *   strangers standing in for an invented firm's partners.
 * - `Gallery` - a law firm has no portfolio of work to show, and the block
 *   renders nothing for an empty list anyway.
 * - `TeamGrid` - the roster belongs on /attorneys, which Phase 7 builds. It was
 *   showing the kit's seeded dentists.
 * - `Testimonials` and `Reviews` - see config/content/testimonials.ts. Publishing
 *   fabricated client praise for a fictional firm is not a styling decision.
 * - `QuoteCalculator` - flag is off; a firm cannot honestly quote fees from a form.
 * - `ContactCTA` (the "Visit us" band) - a whole section for a street address,
 *   below a page whose one ask is "book a consultation". The details moved to
 *   the footer, which is where someone looking for an address goes anyway.
 *
 * `ContactForm` is back, and last. It was removed on the argument that a form
 * competes with the hero's "book a consultation" - which holds only if it sits
 * near the top. At the foot of the page it catches a different reader: someone
 * who has read the whole thing and wants to describe a problem rather than pick
 * a time slot. The order is what keeps the two asks from fighting.
 *
 * What is left is a single argument: here is what we do, here are the two halves
 * of the firm, here is the thing we are actually better at, book a time.
 */
export default async function Home() {
  const [business, featured] = await Promise.all([getBusiness(), listFeatured()]);
  const bookingEnabled = isFeatureEnabled("booking");

  return (
    <main className="flex-1">
      <FirmHero business={business} />

      <FeaturedStrip items={featured} />

      <AudienceSplit />

      <CrossBorderStrip />

      {bookingEnabled && (
        <ServicesGrid
          services={services}
          title="Start with a conversation"
          // Booking lives on its own route here, not on this page. Without
          // this the cards keep the kit's default and link to `/#booking` —
          // an anchor no page on this site carries any more, so every tile
          // silently reloaded the homepage and went nowhere.
          bookingHref="/consultation"
          deck="The first one is free and carries no obligation. If we are not the right firm for your matter, we will say so and point you somewhere better."
          footer={
            <Link href="/consultation" className={buttonVariants({ size: "lg" })}>
              See available times
            </Link>
          }
        />
      )}

      <ContactForm business={business} />
    </main>
  );
}
