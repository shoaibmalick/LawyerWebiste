import { z } from "zod";

/**
 * The practice-area content model.
 *
 * Deliberately separate from `serviceSchema` in `content.schema.ts`. That one is
 * appointment-shaped — `durationMinutes` is required and every card it renders
 * links into `#booking` — because it describes a thing you can book a slot for.
 * A practice area is a thing you read. Widening one schema to carry both would
 * have made `durationMinutes` optional for everybody, which is a worse trade
 * than two schemas that each say exactly what they mean.
 *
 * Nothing here is `.optional()` except where the absence is itself meaningful.
 * This repo is not a template that merges upstream, so the reasoning that makes
 * `category` optional over in `content.schema.ts` — a required field hard-failing
 * `parse` in a client repo nobody had touched — does not apply. Content that is
 * missing a summary or an SEO title should fail loudly at module load.
 */

export const JURISDICTIONS = ["US", "CA"] as const;
export const jurisdictionSchema = z.enum(JURISDICTIONS);
export type Jurisdiction = z.infer<typeof jurisdictionSchema>;

export const AUDIENCES = ["business", "individual"] as const;
export const audienceSchema = z.enum(AUDIENCES);
export type Audience = z.infer<typeof audienceSchema>;

/** lowercase kebab-case; the URL segment and the lookup key. */
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lowercase kebab-case");

/**
 * Search metadata.
 *
 * `title` is capped at 60 because Google truncates around there, and a title
 * that ends in an ellipsis wastes the most valuable string on the page.
 *
 * `description` allows 170 rather than the 160 the content files target. Ten
 * characters of slack is the difference between a review note and a module-load
 * crash on a content edit, and a description is truncated by the search engine
 * rather than being wrong.
 */
const seoSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().min(50).max(170),
});

export const faqSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(1200),
});
export type Faq = z.infer<typeof faqSchema>;

export const legalServiceSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  /**
   * Card copy, and the only text shown in a grid. It has to stand alone: a
   * visitor scanning twenty-four cards never sees the description.
   */
  summary: z.string().min(1).max(220),
  description: z.string().min(1),
  /**
   * Exactly four. Not "at least one" — the grids below lay these out in a fixed
   * two-by-two, and a service with three would leave a hole while one with five
   * would silently drop the fifth. The content files are written to four.
   */
  keyFeatures: z.array(z.string().min(1)).length(4),
  jurisdictions: z.array(jurisdictionSchema).min(1),
  /** Feeds both the on-page accordion and the page's FAQPage JSON-LD. */
  faqs: z.array(faqSchema).min(2).max(5),
  /**
   * Other services worth reading next. Checked against the real slug set in
   * `config/content/practice-areas/index.ts` — a schema cannot see its siblings,
   * so a dangling reference has to be caught one level up.
   */
  relatedSlugs: z.array(slugSchema).default([]),
  cta: z.string().min(1).max(80),
  /** A real `lucide-react` icon name, verified against the installed package. */
  icon: z.string().min(1),
  seo: seoSchema,
});
export type LegalService = z.infer<typeof legalServiceSchema>;

export const practiceAreaSchema = z.object({
  slug: slugSchema,
  audience: audienceSchema,
  name: z.string().min(1),
  tagline: z.string().min(1).max(120),
  overview: z.string().min(1),
  icon: z.string().min(1),
  /** Display order within an audience. Contiguous from 1; asserted in index.ts. */
  order: z.number().int().positive(),
  seo: seoSchema,
  services: z.array(legalServiceSchema).length(4),
});
export type PracticeArea = z.infer<typeof practiceAreaSchema>;

export const practiceAreasSchema = z.array(practiceAreaSchema);
