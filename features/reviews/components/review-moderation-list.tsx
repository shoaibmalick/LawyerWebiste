"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  approveReviewAction,
  deleteReviewAction,
  hideReviewAction,
  type ReviewActionResult,
} from "../api/moderate-review";

/**
 * A narrow view-model, not the Prisma row.
 *
 * `submittedLabel` is formatted on the server on purpose: lib/format.ts
 * imports config/site.config.ts for the business timezone, so formatting here
 * would pull the whole site config into the browser bundle — and preformatting
 * makes a server/client date mismatch structurally impossible rather than
 * merely unlikely.
 */
export type ReviewRow = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  status: "PENDING" | "APPROVED" | "HIDDEN";
  submittedLabel: string;
};

const STATUS_LABELS: Record<ReviewRow["status"], string> = {
  PENDING: "Awaiting review",
  APPROVED: "Published",
  HIDDEN: "Hidden",
};

export function ReviewModerationList({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReviewActionResult | null>(null);
  /** Which button was clicked, so only that one shows a progress verb. */
  const [acting, setActing] = useState<{ id: string; verb: string } | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  function run(id: string, verb: string, action: () => Promise<ReviewActionResult>) {
    setResult(null);
    setActing({ id, verb });

    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);

      // Refresh on failure too. The commonest failure is "that review is
      // gone", which means this list is stale — and refreshing is exactly
      // what fixes it.
      router.refresh();

      // Both must be cleared here. router.refresh() re-renders the server
      // component, but this client component instance survives — so a
      // confirmingDeleteId left set would still be armed after the rows
      // reorder, and the next click would delete the wrong review.
      setActing(null);
      setConfirmingDeleteId(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Announced to screen readers as well as shown, since it is the only
          confirmation that anything happened. */}
      <p aria-live="polite" className="sr-only">
        {result ? (result.ok ? result.message : result.error) : ""}
      </p>
      {result && (
        // aria-hidden because the live region above already announces this
        // text; without it a screen reader reads the same message twice.
        <p
          aria-hidden="true"
          className={result.ok ? "text-foreground text-sm" : "text-destructive text-sm"}
        >
          {result.ok ? result.message : result.error}
        </p>
      )}

      {/*
       * The empty state lives here rather than in the page, and the status
       * line above it is rendered unconditionally, because acting on the last
       * row in a view empties the list. An early return on `reviews.length
       * === 0` unmounted the status line at exactly that moment — so deleting
       * the final pending review, the most consequential action on this page,
       * confirmed nothing at all.
       */}
      {reviews.length === 0 && (
        <p className="text-muted-foreground text-sm">No reviews in this view.</p>
      )}

      {reviews.map((review) => {
        const busy = acting?.id === review.id;
        const label = (idle: string, verb: string) => (busy && acting?.verb === verb ? verb : idle);

        return (
          <div
            key={review.id}
            className="border-border flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-foreground font-medium">
                {review.authorName} · {"★".repeat(review.rating)}
                <span className="text-muted-foreground font-normal">
                  {"☆".repeat(5 - review.rating)}
                </span>
              </p>
              <p className="text-muted-foreground">{review.comment}</p>
              <p className="text-muted-foreground">
                {review.submittedLabel} · {STATUS_LABELS[review.status]}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {confirmingDeleteId === review.id ? (
                <>
                  {/* Order matters: the confirm button must land to the RIGHT
                      of where Delete was, so a double-click on Delete cannot
                      land on "Yes, delete". */}
                  <span className="text-muted-foreground">Delete permanently?</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => setConfirmingDeleteId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(review.id, "Deleting…", () => deleteReviewAction({ reviewId: review.id }))
                    }
                  >
                    {label("Yes, delete", "Deleting…")}
                  </Button>
                </>
              ) : (
                <>
                  {review.status !== "APPROVED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(review.id, "Publishing…", () =>
                          approveReviewAction({ reviewId: review.id }),
                        )
                      }
                    >
                      {label(review.status === "HIDDEN" ? "Publish" : "Approve", "Publishing…")}
                    </Button>
                  )}
                  {review.status !== "HIDDEN" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(review.id, "Hiding…", () => hideReviewAction({ reviewId: review.id }))
                      }
                    >
                      {label("Hide", "Hiding…")}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() => setConfirmingDeleteId(review.id)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
