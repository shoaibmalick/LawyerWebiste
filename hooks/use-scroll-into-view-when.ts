"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Scrolls an element into view the first time a condition becomes true.
 *
 * Written for the moment a form is replaced by its confirmation. Every public
 * form on the site is tall — the booking form is around a thousand pixels of
 * treatment picker, calendar, time slots and fields — and every confirmation
 * is a single line. When one replaces the other the document collapses by
 * roughly a screen height, and the browser keeps the scroll *offset* rather
 * than the content. The visitor is left looking at whatever now occupies that
 * position: blank space, or the section below. The confirmation rendered
 * correctly; it is simply above the fold, and nothing tells them their booking
 * worked.
 *
 * That is a bad failure for a booking form in particular. Someone who cannot
 * see a confirmation assumes it did not work and books again, or rings the
 * practice — the receptionist then has two requests from one patient and no
 * way to know which is real.
 *
 * Fires once per transition into the condition, not on every render, so it
 * does not fight a visitor who scrolls away afterwards. Honours
 * `prefers-reduced-motion`, like the rest of the site's motion.
 */
export function useScrollIntoViewWhen<T extends HTMLElement>(
  condition: boolean,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!condition) return;

    ref.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
  }, [condition]);

  return ref;
}
