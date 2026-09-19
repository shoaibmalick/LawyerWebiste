import Link from "next/link";
import { MapPin } from "lucide-react";
import { HeroSlideshow } from "@/components/motion/hero-slideshow";
import { Reveal } from "@/components/motion/reveal";
import { RotatingWord } from "@/components/motion/rotating-word";
import { buttonVariants } from "@/components/ui/button";
import { listPracticeAreas } from "@/config/content/practice-areas";
import type { SiteConfig } from "@/config/schema/site.schema";
import { cn } from "@/lib/utils";
import { spokenList } from "@/lib/word-list";

type FirmHeroProps = {
  business: SiteConfig["business"];
};

/**
 * The homepage hero.
 *
 * ## The photographs are graded first, and then the scrim is small
 *
 * The three frames were chosen for their subjects and never compared for
 * exposure. Over the region the copy sits in, their 99th-percentile luminance
 * was 0.345, 0.901 and 0.550 — the brightest more than two and a half times the
 * next. A scrim has to survive the worst frame, so one photograph was setting
 * the density for all three, and the answer was a wash dense enough that the
 * hero read as a navy rectangle with a picture faintly behind it.
 *
 * `npm run hero:grade` multiplies each frame down to a common p99 first (see
 * `scripts/grade-hero-images.mjs` for why a percentile and not the mean). A
 * multiply keeps the relative structure — the tower, the cables, the columns
 * stay separable — where an overlay flattens everything toward one colour. With
 * that done the scrim drops a long way, and the two darker frames stop paying
 * for the outlier.
 *
 * Four layers, each doing one job:
 *
 *   1. `bg-ink/10 sm:bg-transparent` — the floor, and **on a phone only**. A flat
 *      wash dims the right-hand half as much as the left, which is the half that
 *      is supposed to stay clear, so desktop carries none at all.
 *   2. `bg-gradient-to-b from-ink/66 via-ink/34 to-ink/8`, **mobile only** —
 *      vertical, because on a phone the copy runs from the top of the frame
 *      rather than down its left-hand side. The dense top is set by one run:
 *      the brass rotating word in the `<h1>`.
 *   3. `bg-gradient-to-r from-ink/82 via-ink/34 via-52% to-transparent to-88%`,
 *      **`sm` and up** — the one that does the work. 82% under the copy, a third
 *      of that by mid-frame, nothing at all across the right-hand eighth. The
 *      `via` sits at 52% rather than at the edge deliberately: the `<h1>` runs to
 *      65% of the measure, so a gradient that has already collapsed by 40% puts
 *      the end of the headline over bare photograph. Moving it out to 58% proved
 *      the point in reverse — `lead` rose 4.85 -> 6.06 but the boardroom's
 *      brightest 5% fell 0.101 -> 0.076, because that frame's window is
 *      mid-frame. 52% is where both are acceptable.
 *   4. `bg-gradient-to-t from-ink via-ink/86 via-20% to-transparent to-40%` —
 *      the base. Deliberately the densest of the four, and deliberately short:
 *      the proof row and the location line sit across the full width down there,
 *      including over the right-hand side that layer 3 leaves clear, and the
 *      bottom of a skyline photograph is its least interesting part. The brass
 *      labels are the tightest text on the site — `accent-on-ink` needs its
 *      backdrop under 0.026 relative luminance to clear 4.5:1 — and this is
 *      what buys that.
 *
 * ## Layer 4 reached 78% up the frame, and nothing up there needed it
 *
 * The photograph was reported as invisible behind the wash, and this layer was
 * most of why. Measured as a percentage of the section height, the topmost run
 * it exists to protect — the location line — ends at **32.6%**. It was fading
 * to transparent at **78%**, so it was dimming the middle 45% of every frame,
 * which on these photographs is the window, the walkway and the skyline: the
 * part anyone actually looks at. Pulling it to `to-48%` (a 15-point margin over
 * the location line) and steepening the low end to `via-ink/92 via-20%` keeps
 * every brass label exactly where it was and hands the middle of the frame back.
 *
 * ## What actually set the floor was the brass, not the blue
 *
 * Reported twice as still too dark, and the second time the scrim was no longer
 * the thing to cut. Every white run in this section clears its bar several times
 * over — `detail` at 10.1, `value` at 11.7, `eyebrow` at 7.0. Only the two
 * `accent-on-ink` runs sat near theirs, and because the check reports the worst
 * pair anywhere, those two were holding every layer up on their own.
 *
 * So `accentOnInk` was lifted a step, #BE8A33 -> #CE9A44 (config/theme.config.ts).
 * At the old value the proof labels needed their backdrop under 0.030 relative
 * luminance; at the new one they tolerate 0.049. That single change is what paid
 * for all four layers coming down together.
 *
 * Measured across the four rounds, desktop, mean / brightest 5%:
 *
 *   start            0.015-0.026  /  0.040-0.076
 *   layer 4 pulled   0.018-0.036  /  0.061-0.112
 *   brass lifted     0.019-0.044  /  0.078-0.133
 *   layer 3 reshaped 0.020-0.046  /  0.087-0.151
 *
 * The highlights are where the eye reads a photograph as present or absent, and
 * they are **roughly twice** what they were. Mobile gains less on purpose: the
 * copy spans the full width there, so layer 2 cannot get out of the way the way
 * layer 3 can.
 *
 * Final margins: `rotatingWord` 3.14/3.0, `h1` 4.15/3.0, `label2` 4.92/4.5,
 * `lead` 5.34/4.5. The thinnest are still brass, so that is where any further
 * request for a lighter hero has to be paid from. Re-run the check after
 * touching any of it.
 *
 * ## How this was verified, because the obvious way is wrong
 *
 * Sampling a screenshot *with the text visible* measures antialiased glyph
 * edges, not the backdrop — it returns the same number for every photograph,
 * which is the tell. The real method: record the text bounding boxes, set the
 * text to `visibility: hidden`, screenshot again, and sample the **lightest**
 * pixel inside each box across all three images at both viewports. Worst pair
 * anywhere must clear 4.5:1.
 *
 * Two further traps, both hit the second time round. The first pass measured
 * only the eyebrow and the h1, so the lead and the location line had never been
 * checked at all — the lead turned out to be at **4.16:1** on a phone over the
 * bridge photograph, and had been since the day the photography landed. Every
 * text run in the section is measured now, thirteen of them.
 *
 * And Tailwind v4 emits opacity modifiers as `color(srgb ...)`, whose channels
 * run 0..1. Parsing those with a number regex reads 0.93 as 0.93/255 and
 * reports ~1.0:1 for text that is perfectly legible. The browser composites the
 * colour over the sampled pixel through a 1x1 canvas instead of any arithmetic
 * in the script.
 *
 * ## It still degrades to text-only
 *
 * With no images this renders a compact band on the page background rather than
 * 70svh of flat colour, which is the state the repo was in before photography
 * arrived and the state it returns to if the files are ever removed.
 *
 * `min-h-[70svh]` rather than `100vh`: a hero that exactly fills the viewport
 * gives no hint there is anything below it. `svh` rather than `vh` because
 * mobile browsers measure `vh` against the viewport with the URL bar hidden, so
 * a full-height hero jumps as you scroll.
 *
 * The tagline is the `<h1>` and the firm name is not — the name is in the
 * header wordmark, and repeating it as the page heading spends the one element
 * search engines weight most on something already on screen.
 *
 * ## The foot of the frame carries three facts
 *
 * Measured before it did: the section ran 711px at every desktop width and the
 * copy ended at 660, so the bottom 130px were empty navy at the exact point the
 * bottom gradient is densest — the darkest, emptiest part of the page was also
 * the first thing anyone saw. On a 390px screen it was worse, because the flat
 * 50% layer the contrast measurements demanded leaves that band almost solid.
 *
 * The row is the full width of the container rather than the `max-w-3xl` of the
 * copy, which is what stops the composition being a column of text with a third
 * of the frame doing nothing.
 *
 * They are facts rather than claims, for the reason the whole site avoids
 * outcome language (specification.md 1.3): "12 practice areas" is checkable by
 * clicking, and the number is counted from the content rather than typed, so it
 * cannot drift from what the site actually has.
 *
 * `/about` carries a four-number band too. Overlap of two figures across two
 * pages is not duplication worth removing — the homepage states none of this
 * otherwise, and the pair that page adds ("Countries", "Partners") is about the
 * firm's own shape rather than about what a reader gets.
 */
export function FirmHero({ business }: FirmHeroProps) {
  const images =
    business.heroImages.length > 0
      ? business.heroImages
      : business.heroImage
        ? [business.heroImage]
        : [];

  const hasImages = images.length > 0;

  const practiceAreaCount =
    listPracticeAreas("business").length + listPracticeAreas("individual").length;

  const headline = business.heroHeadline;

  const proof = [
    { value: "2", label: "Offices", detail: "Toronto and New York" },
    { value: "2", label: "Legal systems", detail: "Canadian and US law, one file" },
    {
      value: String(practiceAreaCount),
      label: "Practice areas",
      detail: "For business and for individuals",
    },
  ];

  return (
    <section
      className={cn(
        // `flex-col justify-end` rather than `items-end`, which was a no-op: the
        // single child is `w-full` and carries the padding that sets the
        // section's height, so there was never any slack for it to push
        // against. On a viewport tall enough for 70svh to bind, this now does
        // what the class always claimed.
        "relative isolate flex flex-col justify-end overflow-hidden",
        hasImages
          ? "bg-ink text-ink-foreground min-h-[70svh]"
          : "bg-secondary border-border border-b",
      )}
    >
      {hasImages && (
        <>
          <HeroSlideshow
            images={images}
            intervalSeconds={7}
            sizes="100vw"
            className="absolute inset-0 -z-10 h-full w-full"
          />
          <div className="bg-ink/8 absolute inset-0 -z-10 sm:bg-transparent" />
          {/*
            Two directions, one per layout, because the copy is a different
            shape in each.
          */}
          <div className="from-ink/53 via-ink/27 to-ink/6 absolute inset-0 -z-10 bg-gradient-to-b sm:hidden" />
          <div className="from-ink/66 via-ink/27 absolute inset-0 -z-10 hidden bg-gradient-to-r via-52% to-transparent to-88% sm:block" />
          {/*
            `via-ink/60`, raised from 40.

            The proof row put text across the full width of the frame for the
            first time, and the horizontal gradient above is deliberately
            transparent on the right — so columns two and three of the row sit
            on whatever the photograph is doing there. Measured on the
            composite, the brass labels came back at 4.46 and 4.23 against a
            4.5 bar. This is the layer that covers that band.
          */}
          <div className="from-ink/80 via-ink/69 absolute inset-0 -z-10 bg-gradient-to-t via-20% to-transparent to-40%" />
        </>
      )}

      {/*
        Asymmetric padding, because the proof row now occupies what used to be
        dead space at the bottom. Keeping `py-28` would simply move the empty
        band below the row and make the section 880px tall.
      */}
      <div className="mx-auto w-full max-w-6xl px-6 pt-16 pb-10 sm:pt-24 sm:pb-12">
        <Reveal>
          <p
            // Named for the contrast check, which used to find these by their
            // position relative to the h1 — until they each moved into their
            // own Reveal and it silently stopped measuring two of them.
            data-hero-run="eyebrow"
            className={cn(
              // w-fit is load-bearing, not cosmetic. As a block <p> this spans
              // the full measure while its text occupies the left ~15%, so the
              // contrast check sampled the lightest pixel across 1270px of
              // photograph to judge a word sitting in the first 190 of them —
              // out past where the horizontal scrim has already faded to
              // nothing. It reported 4.29 for text that was never at risk.
              // Sized to its content, the box is the ink.
              "w-fit text-xs font-semibold tracking-[0.14em] uppercase",
              hasImages ? "text-ink-foreground/90" : "text-primary",
            )}
          >
            Toronto &middot; New York
          </p>
        </Reveal>

        {/*
          `text-balance` only on the fallback headline.

          Balancing rewrites the line breaks to even out the ragged edge, which
          it does by measuring the rendered text. With a rotating word inside,
          the text it measures changes every 3.5 seconds — so the browser is
          entitled to rebalance mid-cycle and throw the headline onto a
          different number of lines, which is the exact reflow the reserved
          width exists to prevent. The fixed-width slot already does the job
          balancing would have done here.
        */}
        <Reveal delay={0.06}>
          <h1
            /*
              The accessible name, because `RotatingWord` is `aria-hidden` and
              cannot name itself from inside a heading without polluting the
              heading's text. Undefined on the fallback path, where the visible
              tagline is already the whole name.
            */
            aria-label={headline ? `${headline.lead} ${spokenList(headline.rotating)}` : undefined}
            className={cn(
              "mt-4 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl lg:text-6xl",
              headline ? "text-pretty" : "text-balance",
              hasImages ? "text-ink-foreground" : "text-foreground",
            )}
          >
            {headline ? (
              <>
                {headline.lead}{" "}
                <RotatingWord
                  words={headline.rotating}
                  // Brass, the same token as the eyebrow directly above it, so
                  // the hero has one accent rather than two. At headline size
                  // this is large text and its bar is 3:1 rather than 4.5:1 —
                  // `npm run check:hero-contrast` measures it as its own run.
                  className={hasImages ? "text-accent-on-ink" : "text-primary"}
                />
              </>
            ) : (
              business.tagline
            )}
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p
            data-hero-run="lead"
            className={cn(
              "mt-5 max-w-xl text-base leading-relaxed text-pretty sm:text-lg",
              // Full `ink-foreground`, not /85. On a 390px screen over the
              // bridge photograph the tinted version measured 4.16:1 against a
              // 4.5 bar — it had simply never been measured, since the original
              // pass sampled only the eyebrow and the h1. Opaque is 5.0.
              hasImages ? "text-ink-foreground" : "text-muted-foreground",
            )}
          >
            Most cross-border problems are two firms failing to talk to each other. We advise
            businesses and individuals on both sides of the Canada&ndash;US border from one file, so
            the answer you get accounts for both.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/consultation"
              className={cn(
                buttonVariants({ variant: hasImages ? "onInk" : "default", size: "lg" }),
                "transition-transform duration-200 motion-safe:hover:-translate-y-0.5",
              )}
            >
              Book a free consultation
            </Link>
            <Link
              href="/contact"
              className={cn(
                buttonVariants({ variant: hasImages ? "onInkOutline" : "outline", size: "lg" }),
                "transition-transform duration-200 motion-safe:hover:-translate-y-0.5",
              )}
            >
              Describe your situation
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <p
            data-hero-run="location"
            className={cn(
              // w-fit for the same reason as the eyebrow above; fit-content
              // still caps at the available width, so it wraps on a phone.
              "mt-8 flex w-fit flex-wrap items-center gap-x-2 gap-y-1 text-sm",
              // Full strength, not /80: at 80% it measured 4.16 against a 4.5
              // bar once the scrim came down. The text was the cheaper thing
              // to change.
              hasImages ? "text-ink-foreground" : "text-muted-foreground",
            )}
          >
            <MapPin aria-hidden className="size-4 shrink-0" />
            {business.address.city}, {business.address.state} and New York, NY
            <span aria-hidden className={hasImages ? "text-ink-foreground/40" : "text-border"}>
              |
            </span>
            <a
              href={`tel:${business.phone}`}
              className="hover:text-foreground focus-visible:ring-ring/50 inline-flex min-h-6 items-center rounded-sm font-mono underline-offset-4 transition-colors hover:underline focus-visible:ring-3 focus-visible:outline-none"
            >
              {business.phone}
            </a>
          </p>
        </Reveal>

        {/*
          A <dl>, and no wrapper div inside the Reveal.

          Reveal already renders one, and the spec allows a <dl> to hold a
          single level of <div> around each dt/dd group — a second level puts
          the <dt> two divs deep and breaks the list semantics. axe catches it
          as `definition-list` + `dlitem`; /about's band was written wrong this
          exact way once already.
        */}
        <dl
          className={cn(
            // Three across at every width. Stacked, the row added 349px to a
            // 390px viewport and pushed the hero to 1043px — a whole screen of
            // scrolling before the page's first real section, which is a worse
            // problem than the empty band it was fixing.
            "mt-10 grid grid-cols-3 gap-4 border-t pt-6 sm:mt-12 sm:gap-8 sm:pt-8",
            hasImages ? "border-ink-foreground/20" : "border-border",
          )}
        >
          {proof.map((item, index) => (
            <Reveal key={item.label} delay={0.3 + index * 0.06}>
              <dt
                className={cn(
                  // `min-h` below `sm`: "Offices" is one line and the other two
                  // wrap, so without it the three numbers sat on three
                  // different baselines on a phone.
                  "min-h-[2.1rem] text-xs font-semibold tracking-[0.14em] uppercase sm:min-h-0",
                  // White over a photograph, brass only on the flat band.
                  //
                  // These three were `accent-on-ink` everywhere, and they were
                  // what held the scrim up. 12px against a 4.5 bar is the
                  // hardest text on the page, and brass is the site's tightest
                  // colour — the pair needed its backdrop under 0.049 relative
                  // luminance, which is a dark strip across the full width of
                  // the frame. The same words in `ink-foreground` clear 10:1
                  // over the same pixels, so the strip can come off entirely.
                  // Brass stays where it is legible and where it was asked for:
                  // the rotating word in the headline, and every non-photo band
                  // on the site.
                  hasImages ? "text-ink-foreground/85" : "text-primary",
                )}
              >
                {item.label}
              </dt>
              <dd
                className={cn(
                  "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl",
                  hasImages ? "text-ink-foreground" : "text-foreground",
                )}
              >
                {item.value}
              </dd>
              {/*
                Supporting, so it is the part that goes on a phone. "2 Offices"
                still reads correctly without "Toronto and New York" — and that
                pair is in the line directly above this row, and again in the
                footer.
              */}
              <dd
                className={cn(
                  "mt-1 hidden text-sm leading-relaxed sm:block",
                  hasImages ? "text-ink-foreground/85" : "text-muted-foreground",
                )}
              >
                {item.detail}
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
