"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`, because the
 * server has no window and must answer something. It answers `false`, and the
 * client corrects it on hydration — so **every caller has to treat `false` as
 * "not yet known" as well as "no"**, and put the safe behaviour on that branch.
 *
 * For `(hover: hover)`, the safe branch is the one this site already had: click
 * to open. A first paint that assumes hover works would arm a hover menu on a
 * phone for one frame, which is the exact trap the menu's own comment warns
 * about.
 *
 * Not for layout. Tailwind's breakpoints do that in CSS, without a hydration
 * pass and without shipping the query to the browser. This is for behaviour
 * that CSS cannot express — what a pointer can do, and what a reader has asked
 * not to see move.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};

      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // Server snapshot. Must be a stable value, not a call into matchMedia.
    () => false,
  );
}

/**
 * True only where a real pointer can hover — a mouse or a trackpad.
 *
 * Both halves are load-bearing. `(hover: hover)` alone is true on some
 * touch-first devices that emulate a hover state on tap, and `(pointer: fine)`
 * alone is true for a stylus that cannot hover at all. Together they describe
 * the one case where opening a menu on approach is safe: a pointer that can be
 * over a thing without having committed to it.
 */
export function useHoverPointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}
