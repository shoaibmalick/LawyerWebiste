import { featuresConfigSchema } from "./schema/features.schema";

/**
 * Flags for Harbourline. Read only through `lib/features.ts::isFeatureEnabled`.
 *
 * - `booking` — the consultation scheduler. A law firm's primary conversion is
 *   "book a consultation", so this is the busiest path on the site.
 * - `quoteCalculator` — OFF. Quoting legal fees from a form is the one thing a
 *   firm cannot honestly do: the fee depends on facts nobody has heard yet, and
 *   both LSO and US state bar advertising rules treat a fee figure as a
 *   representation. The content files describe fee *structures* instead.
 * - `reviews` — OFF. Client reviews of legal representation raise
 *   confidentiality problems a demo should not model as if they were routine.
 *   The curated `Testimonial` copy in config/content is unaffected by this flag.
 * - `payments` — OFF. A non-goal for this demo (specification.md 1.4), and with
 *   no Stripe credentials any service carrying a deposit would fail closed.
 * - `customerAccounts` — OFF. The client portal is explicitly out of scope; see
 *   specification.md 13.
 * - `practiceAreasCms` — ON. The firm can hide, promote, reorder and reword its
 *   own practice areas without a deploy. Config stays the source of truth; the
 *   table holds only what the owner changed.
 * - `aiChatbot` — ON. It answers from config content, and the 144 FAQs the
 *   practice-area files carry are exactly the corpus it is good at. Fails soft
 *   to a "call us" message when ANTHROPIC_API_KEY is unset, which is its state
 *   in this repo.
 */
export const featuresConfig = featuresConfigSchema.parse({
  booking: true,
  quoteCalculator: false,
  reviews: false,
  payments: false,
  customerAccounts: false,
  aiChatbot: true,
  practiceAreasCms: true,
});
