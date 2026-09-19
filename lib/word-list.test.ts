import { describe, expect, it } from "vitest";
import { longestWord, spokenList } from "@/lib/word-list";
import { siteConfig } from "@/config/site.config";

/**
 * The two pure parts of the hero's rotating headline.
 *
 * Only these. Vitest runs in a Node environment here (`vitest.config.mts`) with
 * no jsdom and no testing-library, so `RotatingWord` itself cannot be rendered
 * in a unit test — adding a DOM environment for one component is a bigger
 * change than the component. Its timer, its reduced-motion branch and the
 * reflow it exists to prevent are covered in a browser instead; see
 * specification.md 7.14.
 *
 * These two are worth testing on their own anyway, because both have a failure
 * mode that looks correct in the common case: a two-word list joins the same
 * way whether or not the final "and" is handled properly, and in most word
 * lists the longest word is also the first one.
 */

describe("spokenList", () => {
  it("joins with a final 'and', which is what a screen reader says", () => {
    expect(spokenList(["founders", "families", "employers", "newcomers"])).toBe(
      "founders, families, employers and newcomers",
    );
  });

  it("does not put a comma before the 'and'", () => {
    // It is read aloud. A pause there sounds like a mistake rather than a list.
    expect(spokenList(["a", "b", "c"])).toBe("a, b and c");
  });

  it("handles two words without a stray comma", () => {
    expect(spokenList(["business", "individuals"])).toBe("business and individuals");
  });

  it("degrades to the single word, and to nothing at all", () => {
    expect(spokenList(["founders"])).toBe("founders");
    expect(spokenList([])).toBe("");
  });

  it("contains every word in the list", () => {
    // The guarantee that matters: the visible word changes, so this sentence is
    // the only place the full set is exposed to a screen reader or a crawler.
    const words = siteConfig.business.heroHeadline?.rotating ?? [];
    const spoken = spokenList(words);

    expect(words.length).toBeGreaterThan(1);
    for (const word of words) expect(spoken).toContain(word);
  });
});

describe("longestWord", () => {
  it("reserves the width for the longest word, not the first", () => {
    // The bug this exists for. Pick the first and the box is too narrow for
    // everything after it, so the line reflows on exactly the swaps the
    // reserved width was supposed to make invisible.
    expect(longestWord(["a", "bbbb", "cc"])).toBe("bbbb");
  });

  it("is stable when two words tie, keeping the earlier one", () => {
    expect(longestWord(["aaa", "bbb"])).toBe("aaa");
  });

  it("returns an empty string for an empty list rather than undefined", () => {
    // Rendered directly into JSX, where `undefined` renders nothing but also
    // collapses the box the caller is relying on having a width.
    expect(longestWord([])).toBe("");
  });

  it("is a real word from the firm's own list", () => {
    const words = siteConfig.business.heroHeadline?.rotating ?? [];
    expect(words).toContain(longestWord(words));
  });
});
