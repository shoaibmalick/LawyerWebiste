import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/**
 * The page's vertical rhythm, in one place.
 *
 * Before this, every section carried its own `mx-auto max-w-5xl px-6 py-12
 * sm:py-16` and they had already drifted — three container widths and two
 * padding scales across pages that are meant to read as one site. A visitor
 * does not notice any single one of those; they notice that the site feels
 * slightly loose.
 *
 * `tone` exists because the page's structure is carried by alternating bands —
 * paper, linen, ink — rather than by rules and boxes. Making that a prop rather
 * than a class string means the palette can change without hunting for
 * `bg-secondary` in twenty files.
 */

const TONE_CLASS = {
  plain: "bg-background text-foreground",
  muted: "bg-secondary text-secondary-foreground",
  ink: "bg-ink text-ink-foreground",
} as const;

/**
 * The measure, not the gutter.
 *
 * Both widths sit inside the same `max-w-6xl` page container, so the left edge
 * never moves between sections. `narrow` constrains the *reading measure* and
 * stays left-aligned rather than centring itself.
 *
 * Centring was the first attempt and it looked wrong the moment two widths met
 * on one page: /about puts a four-column stats band over a column of prose, and
 * a centred `max-w-3xl` under a `max-w-6xl` band starts its text 165px further
 * right than the heading above it. Nothing is misaligned in isolation — it just
 * reads as though the page cannot hold a line.
 *
 * A standalone long-form page that genuinely wants a centred column can still
 * pass `className="mx-auto"` to the content, which is a local decision rather
 * than one baked into every section.
 */
const WIDTH_CLASS = {
  /** Full page width. Grids, card rows, stats bands. */
  default: "",
  /** A readable measure for continuous prose, left-aligned to the page gutter. */
  narrow: "max-w-3xl",
} as const;

type SectionProps = {
  children: ReactNode;
  tone?: keyof typeof TONE_CLASS;
  width?: keyof typeof WIDTH_CLASS;
  id?: string;
  className?: string;
};

export function Section({
  children,
  tone = "plain",
  width = "default",
  id,
  className,
}: SectionProps) {
  return (
    <section
      id={id}
      // `scroll-mt-24` so an anchored jump clears the sticky header rather than
      // parking the heading underneath it.
      className={cn(TONE_CLASS[tone], id && "scroll-mt-24", className)}
    >
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className={cn(WIDTH_CLASS[width])}>{children}</div>
      </div>
    </section>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
  /** Ink bands need the eyebrow in the ink-safe brass, not `primary`. */
  tone?: "plain" | "ink";
  className?: string;
};

/**
 * Eyebrow, heading, lead — and the `Reveal` lives *here*, not at the call site.
 *
 * That placement is the whole point. Wrapping headings in a reveal one page at
 * a time is exactly how the eighth one ends up static, and a site where most
 * headings animate and two do not reads as broken rather than as restrained.
 * One component, one behaviour, no decision left to whoever adds the next page.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "plain",
  className,
}: SectionHeadingProps) {
  const isInk = tone === "ink";

  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p
          className={cn(
            "text-xs font-semibold tracking-[0.14em] uppercase",
            /*
             * Full `primary`, not `primary/80`.
             *
             * The /80 came from the sibling site's eyebrow treatment, whose
             * palette is not this one: against this linen band it measures
             * 4.59:1 — over the line, but with nothing to spare on 12px
             * uppercase type. Full primary is 7.29:1 and is barely a different
             * colour to look at.
             *
             * `accent-on-ink` rather than `accent` on dark: the plain accent
             * clears 4.5:1 on the raw ink band by 0.01, which is no margin at
             * all once a surface tints the ground.
             */
            isInk ? "text-accent-on-ink" : "text-primary",
          )}
        >
          {eyebrow}
        </p>
      )}

      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>

      {lead && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed text-pretty",
            isInk ? "text-ink-muted" : "text-muted-foreground",
          )}
        >
          {lead}
        </p>
      )}
    </Reveal>
  );
}
