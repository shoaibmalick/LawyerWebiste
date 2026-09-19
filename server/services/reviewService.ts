import type { ReviewStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type CreateReviewInput = {
  authorName: string;
  rating: number;
  comment: string;
};

/**
 * The review a moderation action referred to is no longer in the table.
 *
 * Reachable in normal use: the dashboard list is a snapshot, and two admins —
 * or two browser tabs — can act on the same row. Modelled as a domain error so
 * the action can say "this list is out of date" rather than throwing a raw
 * Prisma error at the error boundary.
 */
export class ReviewNotFoundError extends Error {
  constructor(id: string) {
    super(`Review ${id} not found`);
    this.name = "ReviewNotFoundError";
  }
}

/**
 * Prisma's "record required but not found", however the pg driver adapter
 * happens to wrap it. Checked structurally rather than with `instanceof
 * PrismaClientKnownRequestError` for the same reason
 * siteSettingsService::isUniqueViolation is — the adapter can surface the same
 * failure in more than one shape.
 */
function isRecordNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

/**
 * Columns named one by one, never `data: input` — the same mass-assignment
 * rule leadService.createReview states, and the reason is sharper here.
 *
 * `status` is the column that matters. Every public read filters
 * `status = APPROVED`, so a review arriving already approved would skip
 * moderation and appear on the site. It is omitted below, which leaves Prisma
 * to apply the schema default of PENDING.
 *
 * Zod already strips unknown keys, so `data: input` is not an open door today.
 * What it is, is a dependency on the schema staying exactly as it is forever:
 * the day someone adds a field for an admin path, the spread carries it
 * straight through. Naming the columns removes that coupling entirely.
 */
function createReview(input: CreateReviewInput) {
  return prisma.review.create({
    data: {
      authorName: input.authorName,
      rating: input.rating,
      comment: input.comment,
    },
  });
}

/**
 * Approved reviews for the public page.
 *
 * Bounded deliberately. This runs on every page render, and a practice that
 * has been collecting reviews for two years would otherwise serialise every
 * one of them into the HTML of every visit. A marketing page wants a
 * convincing sample, not an archive — raise the limit if a client wants more,
 * but it should always have one.
 *
 * The status filter is hardcoded and this function takes no status argument on
 * purpose. It is the only path by which a review reaches the public site, so a
 * caller able to ask it for HIDDEN rows is the single way a review the client
 * deliberately took down gets back onto their homepage. Keep it that way.
 */
const PUBLIC_REVIEW_LIMIT = 24;

function listApproved(limit: number = PUBLIC_REVIEW_LIMIT) {
  return prisma.review.findMany({
    where: { status: "APPROVED" },
    take: limit,
    // id breaks the tie so the order is at least *stable*: createdAt is
    // timestamp(3), and two rows written in the same millisecond would
    // otherwise come back in whatever order Postgres feels like, reshuffling
    // between page loads. cuid() is not guaranteed sortable, so this fixes
    // determinism, not chronology — within one millisecond either order is
    // defensible, but flipping between refreshes is not.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

/**
 * The moderation list. Capped so a spam flood cannot make the dashboard
 * unloadable — the counts alongside tell staff whether more are waiting.
 */
const MODERATION_PAGE_SIZE = 100;

export type ReviewModerationFilters = {
  /** Omitted means every status — the "All" view. */
  status?: ReviewStatus;
};

export type ReviewStatusCounts = Record<ReviewStatus, number> & { all: number };

/**
 * Reviews for the dashboard, optionally narrowed to one status.
 *
 * Returns the counts for every status as well, in one grouped query, because
 * the page renders them as tab labels — and those labels double as feedback:
 * approving a review visibly moves the number from Pending to Published.
 */
async function listForModeration(
  filters: ReviewModerationFilters = {},
  limit: number = MODERATION_PAGE_SIZE,
) {
  const where = filters.status ? { status: filters.status } : {};

  // PENDING is a work queue, so the oldest waiting review comes first. Every
  // other view is an archive, where the most recent is what you want to see.
  const direction = filters.status === "PENDING" ? ("asc" as const) : ("desc" as const);

  const [reviews, matching, grouped] = await Promise.all([
    prisma.review.findMany({
      where,
      take: limit,
      orderBy: [{ createdAt: direction }, { id: direction }],
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({ by: ["status"], _count: true }),
  ]);

  const counts: ReviewStatusCounts = { PENDING: 0, APPROVED: 0, HIDDEN: 0, all: 0 };
  for (const row of grouped) {
    counts[row.status] = row._count;
    counts.all += row._count;
  }

  return { reviews, matching, counts };
}

/**
 * Publish a review.
 *
 * Also the transition out of HIDDEN — putting a review back is the same move
 * as approving it for the first time, and only the button label differs.
 */
async function approveReview(id: string) {
  return updateStatus(id, "APPROVED");
}

/**
 * Take a review off the public site without destroying it.
 *
 * Replaces the old `rejectReview`, which deleted the row outright — a
 * permanent action behind a button that gave no confirmation and no feedback.
 */
async function hideReview(id: string) {
  return updateStatus(id, "HIDDEN");
}

/**
 * There is deliberately no transition back to PENDING. That status means
 * "nobody has looked at this yet", and once somebody has, it is no longer
 * true — a review returned to the queue would be re-moderated forever. Hiding
 * is what "I don't want this published" means.
 */
async function updateStatus(id: string, status: ReviewStatus) {
  try {
    return await prisma.review.update({ where: { id }, data: { status } });
  } catch (error) {
    if (isRecordNotFound(error)) throw new ReviewNotFoundError(id);
    throw error;
  }
}

/** Permanent. The dashboard puts a confirmation step in front of this. */
async function deleteReview(id: string) {
  try {
    return await prisma.review.delete({ where: { id } });
  } catch (error) {
    if (isRecordNotFound(error)) throw new ReviewNotFoundError(id);
    throw error;
  }
}

export const reviewService = {
  createReview,
  listApproved,
  listForModeration,
  approveReview,
  hideReview,
  deleteReview,
};
