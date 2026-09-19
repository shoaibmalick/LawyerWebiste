"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { longestWord } from "@/lib/word-list";

/**
 * How long each word holds before the next replaces it, in milliseconds.
 *
 * 3500, where the reference implementation this was taken from uses 2400.
 * The hero already carries a seven-second photograph crossfade, and two
 * perpetual animations on different periods read as a busy page rather than a
 * lively one. At 3.5s the word changes exactly twice per photograph, so the
 * hero keeps one rhythm; four words is a fourteen-second cycle, two full
 * photographs.
 */
const HOLD_MS = 3500;

/** The site's one easing curve — see components/motion/reveal.tsx. */
const EASE = [0.22, 1, 0.36, 1] as const;

/** Long enough to read as a move, short enough not to be waited on. */
const DURATION = 0.35;

type RotatingWordProps = {
  words: readonly string[];
  /** Applied to the visible word. The colour belongs to the caller. */
  className?: string;
};

/**
 * One word in a line of text, replaced on a timer by the next.
 *
 * The outgoing word slides up and out while the incoming one slides up and in
 * behind it, both clipped by the box. **No opacity fade** — that is what makes
 * it read as one crisp move rather than a dissolve, and it is the single
 * detail most worth keeping if this is ever rewritten.
 *
 * ## Three details that are easy to miss and break it
 *
 * 1. **`inline-grid`, with both spans in `col-start-1 row-start-1`.** They have
 *    to overlap in one cell. Stacked any other way the outgoing word shoves the
 *    incoming one sideways as it leaves.
 * 2. **An invisible span holding the longest word sets the width.** Without it
 *    the line reflows on every swap — and at `lg:text-6xl` across a `max-w-3xl`
 *    measure, a reflow does not nudge a word, it throws the whole headline onto
 *    a different number of lines.
 * 3. **`initial={false}`.** Otherwise the first word slides in on mount, at the
 *    same moment the `Reveal` around the headline is already animating the same
 *    text, and the two compose into a smear.
 *
 * ## What a screen reader gets, and what the caller owes it
 *
 * The whole component is `aria-hidden`, so **the element containing it must
 * carry the full sentence as its accessible name** — `aria-label={`${lead}
 * ${spokenList(words)}`}`. `firm-hero.tsx` does this on its `<h1>`.
 *
 * Labelling from outside rather than hiding an `sr-only` copy inside: this sits
 * in a heading, and a heading's text is read by crawlers as well as by people.
 * An `sr-only` sentence plus a visible word concatenates in `textContent` into
 * "…and newcomersfounders", which is invisible to everyone using the page and
 * wrong to everything reading it. With the label outside, the rendered text is
 * the grammatical line a sighted reader sees and the accessible name is the
 * full list.
 *
 * **Deliberately not a live region.** A polite announcement every 3.5 seconds,
 * for as long as the page is open, is hostile rather than helpful.
 *
 * ## Reduced motion
 *
 * The timer never starts and the first word renders permanently — the finished
 * state, not a faster animation. `hero-slideshow.tsx` set this precedent for
 * the same reason and states it plainly: an endlessly repeating animation that
 * no user action ends is exactly what WCAG 2.2.2 exists for. The honest limit
 * is that `prefers-reduced-motion` is the mechanism; there is no on-page pause
 * control, which is the same exposure the photograph crossfade already carries.
 *
 * The distinct `key` on each branch is load-bearing for the reason
 * `components/motion/reveal.tsx` documents at length: `useReducedMotion()`
 * reports `false` on the first client render, motion writes its transform onto
 * the node imperatively, and React would reuse that node — leaving the word
 * parked off-screen, on exactly the machines that asked for less movement.
 * `data-reveal` on both branches is the CSS backstop for the same failure.
 */
export function RotatingWord({ words, className }: RotatingWordProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion || words.length < 2) return;

    const id = setInterval(() => setIndex((current) => (current + 1) % words.length), HOLD_MS);
    // Cleared on unmount: a route change with the timer still running is a
    // setState against a component that no longer exists.
    return () => clearInterval(id);
  }, [reduceMotion, words.length]);

  const visible = words[index] ?? words[0] ?? "";

  return (
    <span aria-hidden className="relative inline-grid overflow-hidden align-bottom">
      {/*
        Reserves the width, as a pseudo-element rather than as a text node.

        `content: attr(...)` does not appear in `textContent`, and that is the
        whole reason for the indirection. A real span here put the ghost word
        into the heading's text, so the `<h1>` read "Cross-border counsel for
        founders, families, employers and newcomers*employers*founders" to
        anything reading the rendered DOM. Invisible to a person, and to a
        screen reader, and still wrong.
      */}
      <span
        aria-hidden
        data-ghost={longestWord(words)}
        className="invisible col-start-1 row-start-1 whitespace-nowrap before:content-[attr(data-ghost)]"
      />

      {reduceMotion ? (
        <span
          key="word-static"
          data-reveal
          data-rotating-word
          className={cn("col-start-1 row-start-1 whitespace-nowrap", className)}
        >
          {visible}
        </span>
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={visible}
            data-reveal
            data-rotating-word
            className={cn("col-start-1 row-start-1 whitespace-nowrap", className)}
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-100%" }}
            transition={{ duration: DURATION, ease: EASE }}
          >
            {visible}
          </motion.span>
        </AnimatePresence>
      )}
    </span>
  );
}
