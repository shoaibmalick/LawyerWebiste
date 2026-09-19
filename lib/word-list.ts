/**
 * Turning a list of words into text. Used by the hero's rotating headline.
 *
 * In `lib/` rather than beside `components/motion/rotating-word.tsx`, and not
 * by preference — that file is `"use client"`, and every export of a client
 * module is a client reference. `firm-hero.tsx` is a Server Component and needs
 * `spokenList` to build the heading's accessible name, which failed at runtime
 * with *"Attempted to call spokenList() from the server but spokenList is on
 * the client"*. Pure text helpers have no business being marked client-only
 * anyway; this is where `excerpt.ts` and `phone.ts` already live.
 */

/**
 * A list read as one sentence: "a, b, c and d".
 *
 * No Oxford comma, deliberately. This is written to be read aloud as an
 * element's accessible name, and a pause before "and" sounds like a fault
 * rather than punctuation.
 */
export function spokenList(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/**
 * The longest word, by character count.
 *
 * Used to reserve a fixed width for a slot whose contents change, so the line
 * around it never reflows. Character count is an approximation — a proportional
 * typeface can set a longer string narrower than a shorter one — and it is the
 * right one here, because the alternative is measuring text in the browser on
 * mount, which trades a reflow every few seconds for a reflow on every load.
 *
 * Returns `""` for an empty list rather than `undefined`: the result is
 * rendered, and `undefined` collapses the box the caller is relying on.
 */
export function longestWord(words: readonly string[]): string {
  return words.reduce((longest, word) => (word.length > longest.length ? word : longest), "");
}
