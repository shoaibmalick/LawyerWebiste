/**
 * The opening of a longer piece of prose, cut where a reader would cut it.
 *
 * Written to replace `line-clamp`, which is the obvious answer and is wrong for
 * anything a person wrote. CSS clamps by *line*, so it cuts wherever the fourth
 * line happens to run out — which on the attorney roster produced "Ontario's
 * loser-pays costs regime changes th…" and "a Canadian holding US-situs
 * assets…". Both read as a rendering fault rather than as an excerpt, and the
 * cut point moves with the viewport, so there is no width at which the copy can
 * be written to fit.
 *
 * Cutting at a sentence instead means the card shows a complete thought. Every
 * bio on the roster opens with one self-contained sentence naming what that
 * lawyer does, which is exactly what a card wants; the rest is detail for the
 * page behind it.
 *
 * **The abbreviation handling is a heuristic and will not always be right.** It
 * knows initialisms ("U.S."), single initials ("J. Whitcombe") and a short list
 * of common abbreviations, which covers ordinary firm prose. Anything it
 * misreads cuts *early*, at a full sentence — the failure mode is a shorter
 * excerpt, never a broken one. Truncation only happens when a single sentence
 * runs past the budget on its own, and then it happens at a word boundary.
 */

/** Cut here and the excerpt is a stub, so keep looking. */
const MIN_SHARE = 0.3;

/** Followed by a period, these end a word rather than a sentence. */
const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "hon",
  "st",
  "ste",
  "no",
  "vs",
  "v",
  "inc",
  "ltd",
  "llp",
  "llc",
  "corp",
  "co",
  "approx",
  "est",
  "etc",
  "e.g",
  "i.e",
  "cf",
  "al",
]);

/** Quotes and brackets that may sit between a full stop and the space after it. */
const CLOSERS = `"'”’)]`;

function endsASentence(text: string, at: number): boolean {
  // Nothing abbreviates with an exclamation or a question mark.
  if (text[at] !== ".") return true;

  const word = text.slice(0, at).split(/\s+/).pop() ?? "";

  if (/^[A-Za-z]$/.test(word)) return false; // an initial — "J."
  if (/^(?:[A-Za-z]\.)+[A-Za-z]$/.test(word)) return false; // an initialism — "U.S."
  return !ABBREVIATIONS.has(word.toLowerCase());
}

/**
 * `text` cut to the last whole sentence that fits in `budget` characters.
 *
 * Returns the text unchanged when it already fits. Falls back to a whole word
 * plus an ellipsis when one sentence is longer than the budget by itself.
 */
export function excerpt(text: string, budget = 200): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= budget) return clean;

  let cut = -1;
  for (let i = 0; i < Math.min(clean.length, budget); i++) {
    if (!".!?".includes(clean[i])) continue;

    // Step over a closing quote or bracket, then require whitespace: a period
    // inside a number or a URL is not followed by a space.
    let after = i + 1;
    while (after < clean.length && CLOSERS.includes(clean[after])) after++;
    if (after < clean.length && !/\s/.test(clean[after])) continue;

    if (endsASentence(clean, i)) cut = after;
  }

  if (cut >= budget * MIN_SHARE) return clean.slice(0, cut).trim();

  // One sentence, longer than the budget. Break on a word and say so.
  const head = clean.slice(0, budget);
  const lastSpace = head.lastIndexOf(" ");
  const body = lastSpace > 0 ? head.slice(0, lastSpace) : head;
  return `${body.replace(/[\s,;:—–-]+$/, "")}…`;
}
