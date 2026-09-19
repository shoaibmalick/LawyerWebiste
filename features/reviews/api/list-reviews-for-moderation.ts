import { requireAdmin } from "@/lib/auth-guards";
import { reviewService, type ReviewModerationFilters } from "@/server/services/reviewService";

/**
 * Every review, optionally narrowed to one status, for the dashboard.
 *
 * Guarded even though it only reads: this is exported from the feature barrel,
 * so anything in the app could call it, and it returns unpublished and hidden
 * customer submissions. proxy.ts covers the page it is called from today, but
 * that is a routing rule rather than a property of this function.
 */
export async function listReviewsForModeration(filters: ReviewModerationFilters = {}) {
  await requireAdmin();

  return reviewService.listForModeration(filters);
}
