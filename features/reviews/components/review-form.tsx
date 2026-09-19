"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { HoneypotInput } from "@/components/ui/honeypot-input";
import { useScrollIntoViewWhen } from "@/hooks/use-scroll-into-view-when";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { useReviewSubmit } from "../hooks/use-review-submit";
import { createReviewSchema, type CreateReviewInput } from "../schema/review.schema";

export function ReviewForm() {
  const { state, submit } = useReviewSubmit();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateReviewInput>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: { rating: 5 },
  });

  // The confirmation replaces the form; without this it lands above the fold.
  const resultRef = useScrollIntoViewWhen<HTMLParagraphElement>(state.status === "success");

  if (state.status === "success") {
    return (
      <p ref={resultRef} className="text-foreground text-sm">
        Thanks for your review — it&apos;ll appear here once approved.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex max-w-md flex-col gap-4">
      <HoneypotInput registration={register(HONEYPOT_FIELD)} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="authorName" className="text-foreground text-sm font-medium">
          Name
        </label>
        <input
          id="authorName"
          {...register("authorName")}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
        {errors.authorName && (
          <p className="text-destructive text-xs">{errors.authorName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rating" className="text-foreground text-sm font-medium">
          Rating
        </label>
        <select
          id="rating"
          {...register("rating", { valueAsNumber: true })}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="comment" className="text-foreground text-sm font-medium">
          Your review
        </label>
        <textarea
          id="comment"
          rows={4}
          {...register("comment")}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
        {errors.comment && <p className="text-destructive text-xs">{errors.comment.message}</p>}
      </div>

      {state.status === "error" && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isSubmitting || state.status === "submitting"}>
        {isSubmitting || state.status === "submitting" ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
