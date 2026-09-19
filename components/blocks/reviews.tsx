import { ReviewForm, ReviewList, type listApprovedReviews } from "@/features/reviews";

type ReviewsProps = {
  reviews: Awaited<ReturnType<typeof listApprovedReviews>>;
};

export function Reviews({ reviews }: ReviewsProps) {
  return (
    <section id="reviews" className="mx-auto max-w-5xl px-6 py-20">
      <h2 className="text-foreground text-3xl font-semibold tracking-tight">Customer reviews</h2>
      <div className="mt-10">
        <ReviewList reviews={reviews} />
      </div>
      <div className="mt-10">
        <ReviewForm />
      </div>
    </section>
  );
}
