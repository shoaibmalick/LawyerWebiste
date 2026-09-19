import { HeroSlideshow } from "@/components/motion/hero-slideshow";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import type { SiteConfig } from "@/config/schema/site.schema";
import { isFeatureEnabled } from "@/lib/features";
import { summariseOpeningHours } from "@/lib/hours";
import { cn } from "@/lib/utils";

type HeroCinematicProps = {
  business: SiteConfig["business"];
  /** Overrides the default "Book an appointment" for clients who reserve, enrol, or order. */
  primaryLabel?: string;
};

/**
 * The business, full-bleed, with its promise over it.
 *
 * The kit's other hero (`hero.tsx`) puts a 4:3 photograph in a rounded box
 * beside a column of text. That is right where the copy is the point and the
 * picture is reassurance — a dental practice, a law firm. It is backwards
 * wherever the room or the work is what someone is actually choosing between,
 * and a small photo in a rounded rectangle reads as stock imagery because it
 * usually is. Both ship; a client's `app/page.tsx` picks one.
 *
 * ## What a new client has to supply
 *
 * `business.heroImages` — one or more paths under `/public`. Ask for them at
 * intake; they are the single largest visual decision on the site and the
 * hardest thing to substitute for later. See the onboarding checklist in
 * CLAUDE.md.
 *
 * **It degrades deliberately with none.** An empty list renders a compact
 * text-only band on the normal page background rather than 82svh of flat dark
 * colour, so a client repo mid-onboarding looks unfinished rather than broken.
 * That is the state every clone starts in.
 *
 * ## Two layout decisions
 *
 * `min-h-[82svh]` rather than `100vh`: a hero that exactly fills the viewport
 * gives no hint there is anything below it. `svh` rather than `vh` because
 * mobile browsers measure `vh` against the viewport with the URL bar hidden,
 * so a full-height hero jumps as you scroll.
 *
 * The tagline is the `<h1>` and the business name is not. The name belongs in
 * the header wordmark; repeating it as the page heading spends the one element
 * search engines and screen readers weight most on something already on screen.
 */
export function HeroCinematic({ business, primaryLabel }: HeroCinematicProps) {
  const images =
    business.heroImages.length > 0
      ? business.heroImages
      : business.heroImage
        ? [business.heroImage]
        : [];

  const hasImages = images.length > 0;
  const bookingEnabled = isFeatureEnabled("booking");
  const hours = summariseOpeningHours(business.hours);

  return (
    <section
      className={cn(
        "relative isolate flex overflow-hidden",
        hasImages
          ? "bg-ink text-ink-foreground min-h-[82svh] items-end"
          : "border-border bg-secondary/30 border-b",
      )}
    >
      {hasImages && (
        <>
          <HeroSlideshow images={images} sizes="100vw" className="absolute inset-0 h-full w-full" />
          {/*
            Bottom-weighted so the headline has a ground to sit on while the
            photograph stays readable at the top. Two stops rather than one: a
            flat wash at the strength the text needs drowns the lit parts of
            the room, which are the reason to use the photograph at all.
          */}
          <div className="from-ink/92 via-ink/55 to-ink/10 absolute inset-0 bg-gradient-to-t" />
        </>
      )}

      <div
        className={cn(
          "relative mx-auto w-full max-w-6xl px-6",
          hasImages ? "pt-28 pb-12 sm:pb-16" : "py-24",
        )}
      >
        <Reveal className="max-w-3xl">
          <p
            className={cn(
              "font-mono text-xs font-medium tracking-[0.2em] uppercase",
              hasImages
                ? "text-accent drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]"
                : "text-muted-foreground",
            )}
          >
            {business.address.city}, {business.address.state}
          </p>

          <h1
            className={cn(
              "mt-5 text-4xl leading-[1.03] font-extrabold tracking-tight text-balance sm:text-6xl",
              hasImages ? "lg:text-7xl" : "text-foreground sm:text-5xl",
            )}
          >
            {business.tagline}
          </h1>

          <p
            className={cn(
              "mt-6 max-w-xl text-base text-pretty sm:text-lg",
              hasImages ? "text-ink-foreground/85" : "text-muted-foreground",
            )}
          >
            {business.description}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={bookingEnabled ? "#booking" : "#contact"}
              className={cn(buttonVariants({ size: "lg" }))}
            >
              {primaryLabel ?? (bookingEnabled ? "Book an appointment" : "Get in touch")}
            </a>
            <a
              href={`tel:${business.phone}`}
              className={cn(
                "inline-flex items-center rounded-md border px-5 py-2.5 font-mono text-sm transition-colors pointer-coarse:min-h-11",
                hasImages
                  ? "border-ink-muted/40 text-ink-foreground hover:border-ink-foreground"
                  : "border-border text-foreground hover:bg-muted",
              )}
            >
              {business.phone}
            </a>
          </div>
        </Reveal>
      </div>

      {/*
        Opening hours as a hairline strip along the bottom of the photograph.
        Mono because it is data, and it is the first useful thing the page can
        say: when someone can actually come in. Only with images — without
        them there is no band for it to sit in, and the contact block covers it.
      */}
      {hasImages && hours && (
        <div className="border-ink-muted/25 absolute inset-x-0 bottom-0 border-t">
          <div className="text-ink-muted mx-auto max-w-6xl px-6 py-3 font-mono text-[11px] tracking-wide sm:text-xs">
            {hours}
          </div>
        </div>
      )}
    </section>
  );
}
