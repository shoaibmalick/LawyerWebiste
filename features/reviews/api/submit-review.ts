import { getBusiness } from "@/features/site-settings";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { reviewService } from "@/server/services/reviewService";
import type { CreateReviewInput } from "../schema/review.schema";

export async function submitReview(input: CreateReviewInput) {
  const review = await reviewService.createReview(input);

  // `comment` is public free text; escape it before it becomes markup. The
  // rating is a schema-bounded number, but escaping costs nothing and means
  // nobody has to re-derive which of these two was the safe one.
  await sendEmail({
    to: (await getBusiness()).email,
    subject: `New review awaiting approval from ${input.authorName}`,
    // "hide", not "reject": rejecting used to delete the review outright, and
    // an email that teaches the old model would confuse the client for a year.
    html: `<p>${escapeHtml(String(input.rating))}/5 — "${escapeHtml(
      input.comment,
    )}"</p><p>Publish or hide it from the dashboard.</p>`,
  });

  return review;
}
