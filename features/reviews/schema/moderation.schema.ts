import { z } from "zod";
import { ReviewStatus } from "@/generated/prisma/enums";

// Derived from the Prisma enum rather than restated, so the two cannot drift —
// the same trick themePresetSchema uses against THEME_PRESET_KEYS. Zod 4
// folded nativeEnum into z.enum, so an enum-like object is accepted directly.
export const reviewStatusSchema = z.enum(ReviewStatus);

export const reviewIdSchema = z.object({ reviewId: z.string().min(1) }).strict();

/** The moderation view, which is a status or the unfiltered "everything". */
export type ReviewStatusView = ReviewStatus | "ALL";

/**
 * A repeated query key (`?status=a&status=b`) arrives as an array, so every
 * search param has to be narrowed before it can be parsed.
 */
export function firstParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Which reviews the dashboard should show.
 *
 * Defaults to PENDING because moderation is the job with a deadline — a review
 * nobody has looked at is the only kind that needs attention today. Everything
 * else is one click away.
 *
 * Unrecognised input falls back rather than 404s. A mistyped URL should show
 * the admin something useful, not an error page; there is nothing dangerous
 * about guessing wrong here.
 */
export function parseReviewStatusParam(raw: string | string[] | undefined): ReviewStatusView {
  const value = firstParam(raw)?.trim().toUpperCase();

  if (!value) return "PENDING";
  if (value === "ALL") return "ALL";

  const parsed = reviewStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : "PENDING";
}
