"use server";

import { requireAdmin } from "@/lib/auth-guards";
import { ReviewNotFoundError, reviewService } from "@/server/services/reviewService";
import { reviewIdSchema } from "../schema/moderation.schema";

export type ReviewActionResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * These return a result rather than void, and that is the fix for "the buttons
 * don't do anything". They previously returned nothing and revalidated
 * nothing, so a click mutated the database and left the screen untouched until
 * a manual reload — the page copy used to say so out loud.
 *
 * There is deliberately no revalidatePath: nothing in this repo is cached (see
 * CLAUDE.md, "Nothing is cached, deliberately"), and every dashboard page plus
 * `/` is force-dynamic, so the homepage picks a change up on its next request.
 * The list component calls router.refresh() to re-render the rows on screen.
 * Adding revalidatePath here would imply a cache that does not exist.
 */
async function moderate(
  input: unknown,
  act: (reviewId: string) => Promise<unknown>,
  message: string,
): Promise<ReviewActionResult> {
  await requireAdmin();

  const parsed = reviewIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That review reference isn't valid." };
  }

  try {
    await act(parsed.data.reviewId);
  } catch (error) {
    if (error instanceof ReviewNotFoundError) {
      // The two-tabs case. Naming the stale list is more useful than naming
      // the missing review, because refreshing is what fixes it — and the
      // component refreshes on failure for exactly this reason.
      return { ok: false, error: "That review no longer exists — this list is out of date." };
    }
    throw error;
  }

  return { ok: true, message };
}

export async function approveReviewAction(input: unknown): Promise<ReviewActionResult> {
  return moderate(input, reviewService.approveReview, "Review published. It's on the website now.");
}

export async function hideReviewAction(input: unknown): Promise<ReviewActionResult> {
  return moderate(
    input,
    reviewService.hideReview,
    "Review hidden. It's off the website — you can put it back from the Hidden tab.",
  );
}

export async function deleteReviewAction(input: unknown): Promise<ReviewActionResult> {
  return moderate(input, reviewService.deleteReview, "Review deleted permanently.");
}
