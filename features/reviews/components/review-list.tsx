import type { listApprovedReviews } from "../api/list-approved-reviews";

type ReviewListProps = {
  reviews: Awaited<ReturnType<typeof listApprovedReviews>>;
};

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return <p className="text-muted-foreground text-sm">No reviews yet — be the first!</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {reviews.map((review) => (
        <blockquote
          key={review.id}
          className="border-border text-muted-foreground rounded-xl border p-6 text-sm"
        >
          <p className="text-foreground">{"★".repeat(review.rating)}</p>
          <p className="mt-2">&ldquo;{review.comment}&rdquo;</p>
          <footer className="text-foreground mt-4 text-sm font-medium">{review.authorName}</footer>
        </blockquote>
      ))}
    </div>
  );
}
