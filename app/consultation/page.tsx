import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Booking } from "@/components/blocks/booking";
import { DemoDisclaimer } from "@/components/blocks/demo-disclaimer";
import { PageHeader } from "@/components/blocks/page-header";
import { services } from "@/config/content/services";
import { getAvailableSlots } from "@/features/booking";
import { getBusiness } from "@/features/site-settings";
import { isFeatureEnabled } from "@/lib/features";

/**
 * Availability is read live. Prerendering this would freeze the slot list at
 * build time - stale forever, and a double-booking risk once slots fill.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a consultation | Harbourline Law Group",
  description:
    "Book an initial consultation, a cross-border strategy session, a business legal audit, or an estate plan review with Harbourline Law Group.",
  alternates: { canonical: "/consultation" },
};

export default async function ConsultationPage() {
  // Gated at the route, not just in the UI. A disabled feature has to be
  // unreachable by URL too, or the flag is decorative.
  if (!isFeatureEnabled("booking")) notFound();

  const [slots, business] = await Promise.all([getAvailableSlots(), getBusiness()]);

  return (
    <main className="flex-1">
      <PageHeader
        eyebrow="Consultations"
        title="Book a time to talk"
        deck="The first conversation is free and carries no obligation. Choose the kind of session that fits, or tell us you are not sure and we will work it out on the call."
        crumbs={[{ label: "Home", href: "/" }, { label: "Book a consultation" }]}
      />

      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <Booking
          slots={slots}
          services={services}
          timezone={business.timezone}
          phone={business.phone}
          title="Choose a time"
          deck="Times are shown in Eastern Time. If nothing here works, say so in the enquiry and we will find something."
          submitLabel="Request this time"
        />

        <DemoDisclaimer variant="inline" className="mt-12" />
      </div>
    </main>
  );
}
