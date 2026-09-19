import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/blocks/breadcrumbs";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  deck?: string;
  crumbs?: Crumb[];
  children?: ReactNode;
  /** Render on the ink band instead of paper. Used by the audience hubs. */
  tone?: "paper" | "ink";
};

/**
 * The top of every page that is not the homepage.
 *
 * One component rather than a header per route, because the thing that makes a
 * site of sixty pages feel like one site is that the first two hundred pixels
 * are always the same shape: where am I, what is this, and one sentence saying
 * whether I am in the right place.
 */
export function PageHeader({
  eyebrow,
  title,
  deck,
  crumbs,
  children,
  tone = "paper",
}: PageHeaderProps) {
  const isInk = tone === "ink";

  return (
    <header
      className={cn(
        "border-b",
        isInk ? "bg-ink text-ink-foreground border-transparent" : "bg-secondary border-border",
      )}
    >
      <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        {crumbs && crumbs.length > 0 && (
          <div
            className={cn(
              "mb-6",
              isInk && "[&_*]:text-ink-muted [&_[aria-current]]:text-ink-foreground",
            )}
          >
            <Breadcrumbs items={crumbs} />
          </div>
        )}

        <Reveal>
          {eyebrow && (
            <p
              className={cn(
                "text-xs font-semibold tracking-[0.14em] uppercase",
                // The ink-safe brass: `accent` clears 4.5:1 on the raw band by 0.01,
                // which is no margin at all once a surface tints the ground.
                isInk ? "text-accent-on-ink" : "text-primary",
              )}
            >
              {eyebrow}
            </p>
          )}

          <h1
            className={cn(
              "mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl",
              isInk ? "text-ink-foreground" : "text-foreground",
            )}
          >
            {title}
          </h1>

          {deck && (
            <p
              className={cn(
                "mt-4 max-w-2xl text-lg leading-relaxed text-pretty",
                isInk ? "text-ink-muted" : "text-muted-foreground",
              )}
            >
              {deck}
            </p>
          )}

          {children && <div className="mt-6">{children}</div>}
        </Reveal>
      </div>
    </header>
  );
}
