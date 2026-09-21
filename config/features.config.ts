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
 * - `aiChatbot` — OFF, and only because there is no key. It answers from config
 *   content, and the 144 FAQs the practice-area files carry are exactly the
 *   corpus it is good at. With ANTHROPIC_API_KEY unset it fails soft to a "call
 *   us" message — correct behaviour, and the wrong thing to show a visitor: a
 *   launcher on every page that opens and cannot answer reads as broken rather
 *   than as unconfigured, which matters while this demo is being shown to
 *   prospective clients. Turning the flag off hides the launcher *and* closes
 *   `POST /api/chatbot`, so the feature is unreachable rather than merely
 *   invisible. To re-enable: set ANTHROPIC_API_KEY and flip this back to true —
 *   nothing else was removed.
 */
export const featuresConfig = featuresConfigSchema.parse({
  booking: true,
  quoteCalculator: false,
  reviews: false,
  payments: false,
  customerAccounts: false,
  aiChatbot: false,
  practiceAreasCms: true,
});
