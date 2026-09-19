"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /**
   * Seconds to hold before starting. Used to stagger a row of cards — pass
   * `index * 0.08` rather than animating the container, which would make the
   * whole row wait on the slowest item.
   */
  delay?: number;
  /** How far it travels, in pixels. Small on purpose; see below. */
  distance?: number;
  className?: string;
};

/**
 * Fade and rise as it enters the viewport.
 *
 * Three decisions worth keeping:
 *
 * **It respects `prefers-reduced-motion` by rendering the finished state, not
 * by shortening the animation.** The failure mode for scroll-reveal is not "it
 * moved too much", it is a reader who never sees the content because the
 * trigger never fired. Reduced motion returns a plain `<div>` with no animation
 * attached at all.
 *
 * **`once: true`.** Re-animating on every scroll past is a page that will not
 * settle, and it makes finding your place after scrolling up genuinely hard.
 *
 * **14px of travel, not 60.** Long slides look impressive in isolation and
 * feel slow when you are trying to read. `amount: 0.15` starts it as the
 * element is entering rather than waiting for it to be mostly on screen, so
 * nothing is still moving by the time your eye arrives.
 *
 * This is the only motion pattern on the site apart from the hero. One
 * well-behaved effect repeated reads as considered; four different ones read as
 * a demo.
 */
export function Reveal({ children, delay = 0, distance = 14, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  /**
   * ## The keys are load-bearing. Do not remove them.
   *
   * `useReducedMotion()` returns `false` on the first client render and only
   * reports the true value once its media-query subscription runs. So on a
   * reduced-motion machine this component mounts the `motion.div` first, and
   * motion immediately writes `opacity: 0; transform: translateY(16px)` onto
   * the DOM node **imperatively** — not through React's `style` prop.
   *
   * When the hook then flips to `true` and this returns the plain `<div>`,
   * React sees the same element type in the same position and reuses the node,
   * updating only `className`. It has no idea motion wrote those inline styles,
   * so it does not clear them. The result is content stuck invisible forever —
   * on exactly the machines that asked for less animation, which is the precise
   * failure this component's docstring claims to prevent.
   *
   * Distinct keys force React to unmount one branch and mount the other, so the
   * static branch gets a clean node with no leftover inline style.
   *
   * Caught by asserting on inline opacity under an emulated reduced-motion
   * context; it is invisible to a normal screenshot and to every other check.
   */
  if (reduceMotion) {
    return (
      <div key="reveal-static" data-reveal className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      key="reveal-animated"
      // The hook is not sufficient on its own — see above. `data-reveal` is the
      // hook that app/globals.css uses to force the finished state under
      // `prefers-reduced-motion`, which is what actually guarantees the content
      // is visible. Removing this attribute silently reintroduces the bug.
      data-reveal
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      /**
       * `margin` expands the observation area 200% upward, and it is not a
       * tuning knob — it is a correctness fix.
       *
       * `whileInView` fires on intersection. An element the reader never
       * intersected — because they jumped straight past it — never fires, and
       * `once: true` means it never recovers. It stays at `opacity: 0`
       * permanently. That is not hypothetical here: the service pages have a
       * jump nav, so clicking "Related services" scrolls past the FAQ block and
       * leaves it blank forever. Measured: 4 of 13 reveals on a service page
       * stuck invisible after a jump to the bottom.
       *
       * Expanding the root upward means anything at or above the viewport
       * counts as seen, so content the reader has scrolled past is shown rather
       * than hidden. Content still *below* the viewport is unaffected and
       * animates in on approach as before.
       */
      viewport={{ once: true, amount: 0.15, margin: "200% 0px 0px 0px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
