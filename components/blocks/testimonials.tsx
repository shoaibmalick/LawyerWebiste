import type { Testimonial } from "@/config/schema/content.schema";

type TestimonialsProps = {
  testimonials: Testimonial[];
};

export function Testimonials({ testimonials }: TestimonialsProps) {
  return (
    <section id="testimonials" className="mx-auto max-w-5xl px-6 py-20">
      <h2 className="text-foreground text-3xl font-semibold tracking-tight">What patients say</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {testimonials.map((testimonial) => (
          <blockquote
            key={testimonial.authorName}
            className="border-border text-muted-foreground rounded-xl border p-6 text-sm"
          >
            <p>&ldquo;{testimonial.quote}&rdquo;</p>
            <footer className="text-foreground mt-4 text-sm font-medium">
              {testimonial.authorName}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
