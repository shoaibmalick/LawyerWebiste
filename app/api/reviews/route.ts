import { NextResponse } from "next/server";
import { createReviewSchema, submitReview } from "@/features/reviews";
import { guardPublicPost, validationError } from "@/lib/api-guards";
import { isFeatureEnabled } from "@/lib/features";
import { isLikelyBot, stripHoneypot } from "@/lib/honeypot";

export async function POST(request: Request) {
  if (!isFeatureEnabled("reviews")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const guard = await guardPublicPost(request, { limitKey: "reviews", max: 5 });
  if (!guard.ok) return guard.response;

  const parsed = createReviewSchema.safeParse(guard.body);
  if (!parsed.success) {
    return validationError("Invalid review.", parsed.error);
  }

  // Filled honeypot: answer exactly as if it had worked, and write nothing.
  // Reviews are the most spam-attractive surface here — a published review is
  // a backlink and a reputation — so this is the one that earns its keep.
  if (isLikelyBot(parsed.data)) {
    return NextResponse.json({ review: null }, { status: 201 });
  }

  const review = await submitReview(stripHoneypot(parsed.data));
  return NextResponse.json({ review }, { status: 201 });
}
