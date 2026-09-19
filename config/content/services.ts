import { servicesSchema } from "../schema/content.schema";

/**
 * Bookable consultation types - NOT the firm's practice areas.
 *
 * Two content models, on purpose. This one is appointment-shaped: every entry
 * needs a `durationMinutes`, `features/booking` sells a slot against it, and
 * `ServicesGrid` links each card into the booking form - `/consultation#booking`
 * here, since `Booking` has its own route on this site. The forty-eight
 * practice-area services live in `config/content/practice-areas/` and are pages
 * you read, not slots you take.
 *
 * Merging the two would mean giving every practice area a meaningless duration,
 * or making `durationMinutes` optional for the booking flow that depends on it.
 * Neither is a trade worth making. See specification.md 4.4.
 *
 * `priceFrom: 0` renders as "Free" rather than "From $0" - that is what the
 * first entry wants, and it is why it is `0` and not omitted. An omitted
 * `priceFrom` shows no price line at all, which is the honest answer for work
 * whose cost genuinely depends on facts nobody has heard yet.
 *
 * No `depositAmount` anywhere: the `payments` flag is off for this demo, and a
 * service carrying a deposit with no Stripe credentials fails the booking
 * closed with a 503 rather than skipping payment.
 */
export const services = servicesSchema.parse([
  {
    slug: "initial-consultation",
    name: "Initial Consultation",
    description:
      "A first conversation about your matter - what you are facing, what your options are, and what working with us would involve. No charge, and no obligation to continue.",
    category: "Consultations",
    durationMinutes: 30,
    priceFrom: 0,
  },
  {
    slug: "cross-border-strategy",
    name: "Cross-Border Strategy Session",
    description:
      "For a matter that touches both Canada and the United States. A Toronto and a New York lawyer on the same call, so you get one answer rather than two halves of one.",
    category: "Consultations",
    durationMinutes: 60,
  },
  {
    slug: "business-legal-audit",
    name: "Business Legal Audit",
    description:
      "A structured review of your entity structure, contracts, employment paperwork and privacy obligations, ending in a written list of what needs attention and in what order.",
    category: "For business clients",
    durationMinutes: 90,
  },
  {
    slug: "estate-plan-review",
    name: "Estate Plan Review",
    description:
      "An existing will, trust or power of attorney read against your current circumstances - and against the rules on the other side of the border, if you hold assets there.",
    category: "For individual clients",
    durationMinutes: 45,
  },
]);
