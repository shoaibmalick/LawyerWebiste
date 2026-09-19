import { testimonialsSchema } from "../schema/content.schema";

/**
 * Deliberately empty, and it should stay that way.
 *
 * The kit ships curated testimonials as agency-authored copy, separate from the
 * `reviews` feature, and normally a client fills this in with real quotes they
 * have permission to publish. Neither half of that is available here.
 *
 * 1. The firm is fictional, so any quote in this file would be an invented
 *    client praising an invented lawyer for work that never happened. That is
 *    fabricated evidence dressed as social proof, and it is the one kind of
 *    demo content that does real harm if the page is ever taken at face value.
 *    "It's only a demo" is not a defence - a page does not carry its own
 *    provenance once someone screenshots it.
 *
 * 2. Even for a real firm, testimonials about legal representation are
 *    constrained in a way they are not for a restaurant. Law Society of Ontario
 *    and US state bar advertising rules restrict statements that a reader could
 *    take as a claim about likely outcomes, and a client's identity in a family,
 *    criminal or immigration matter is confidential in itself - the quote is the
 *    disclosure.
 *
 * The homepage no longer renders the Testimonials block at all, and the
 * `reviews` feature flag is off for the same reason (see
 * config/features.config.ts). The credibility this would have carried is meant
 * to come from the practice-area content instead: naming real statutes,
 * deadlines and cross-border traps a reader can check.
 *
 * If this becomes a real firm's site, fill it in with quotes the clients have
 * given written permission to publish, and check them against the advertising
 * rules of every jurisdiction the firm practises in.
 */
export const testimonials = testimonialsSchema.parse([]);
