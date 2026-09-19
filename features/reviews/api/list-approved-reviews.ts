import { reviewService } from "@/server/services/reviewService";

export async function listApprovedReviews() {
  return reviewService.listApproved();
}
