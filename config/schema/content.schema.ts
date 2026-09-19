import { z } from "zod";

export const serviceSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  /**
   * Which group this service is listed under.
   *
   * Optional, and it must stay optional: `config/schema/features.schema.ts`
   * carries the story of what a field without a default does to a client repo
   * that has not merged it yet — a hard `parse` failure at module load, in a
   * repo nobody had touched. A required category here would do exactly that to
   * `services.parse` in every existing client.
   *
   * A free string rather than an enum. The groups a dental practice needs and
   * the ones a salon needs have nothing in common, and this is content.
   */
  category: z.string().min(1).optional(),
  durationMinutes: z.number().int().positive(),
  priceFrom: z.number().nonnegative().optional(),
  // In cents. Only meaningful when the "payments" feature is enabled — a
  // service without this set never requires payment to book, regardless of
  // the flag (see server/services/bookingService.ts).
  depositAmount: z.number().int().positive().optional(),
  // Optional illustrative image, as a path under /public (e.g.
  // "/images/services/teeth-whitening.jpg"). Omitted → the card renders
  // text-only, exactly as it did before images were supported.
  image: z.string().min(1).optional(),
});
export type Service = z.infer<typeof serviceSchema>;
export const servicesSchema = z.array(serviceSchema);

export const teamMemberSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  bio: z.string().min(1),
  photo: z.string().min(1).optional(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;
export const teamMembersSchema = z.array(teamMemberSchema);

export const galleryImageSchema = z.object({
  src: z.string().min(1),
  /**
   * Real alt text, not decorative. A gallery of a business's own work is
   * content in its own right, and someone using a screen reader is owed a
   * description of what they are being shown — "Long hair with hand-painted
   * caramel balayage", not "salon photo".
   */
  alt: z.string().min(1),
  /** Optional short caption rendered under the image. */
  caption: z.string().min(1).optional(),
});
export type GalleryImage = z.infer<typeof galleryImageSchema>;
export const gallerySchema = z.array(galleryImageSchema);

/**
 * Attribution for one image that is actually displayed on the site.
 *
 * Only published images belong here. A file sitting unused in /public creates
 * no attribution obligation, so listing it would be noise that makes the real
 * obligations harder to see.
 */
export const imageCreditSchema = z.object({
  /** Path under /public, so the entry can be checked against what renders. */
  src: z.string().min(1),
  /** Where it appears, in plain words — "Team", "Practice gallery". */
  usedFor: z.string().min(1),
  title: z.string().min(1),
  creator: z.string().min(1),
  license: z.string().min(1),
  licenseUrl: z.string().min(1),
  sourceUrl: z.string().min(1),
  /**
   * True when the licence legally requires visible credit (CC BY, CC BY-SA).
   * CC0 and public-domain entries are listed as courtesy; this flag is what
   * separates "nice to do" from "must not be removed".
   */
  attributionRequired: z.boolean(),
});
export type ImageCredit = z.infer<typeof imageCreditSchema>;
export const imageCreditsSchema = z.array(imageCreditSchema);

export const testimonialSchema = z.object({
  authorName: z.string().min(1),
  quote: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
});
export type Testimonial = z.infer<typeof testimonialSchema>;
export const testimonialsSchema = z.array(testimonialSchema);
