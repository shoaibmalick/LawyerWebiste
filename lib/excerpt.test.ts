import { describe, expect, it } from "vitest";
import { excerpt } from "@/lib/excerpt";

describe("excerpt", () => {
  it("leaves text that already fits alone", () => {
    expect(excerpt("Short enough.", 200)).toBe("Short enough.");
  });

  it("cuts at the last sentence that fits, keeping its full stop", () => {
    const text = "One sentence here. A second that also fits. A third that does not.";

    expect(excerpt(text, 45)).toBe("One sentence here. A second that also fits.");
  });

  it("never ends mid-word, which is the bug it exists for", () => {
    // The roster's failure: line-clamp left "…costs regime changes th…".
    const bio =
      "Daniel acts for companies in contract, shareholder and oppression-remedy disputes, and in arbitrations seated in both countries. He is the person clients call when a deal has gone wrong, and he is candid about Ontario's loser-pays costs regime.";

    const result = excerpt(bio, 200);

    expect(result).toBe(
      "Daniel acts for companies in contract, shareholder and oppression-remedy disputes, and in arbitrations seated in both countries.",
    );
    expect(result).not.toMatch(/…$/);
  });

  it("does not mistake an initialism for the end of a sentence", () => {
    const text = "Filed in the U.S. and in Canada on the same day. Then argued in Toronto.";

    // Cutting at "U.S." would produce a fragment that reads as a typo.
    expect(excerpt(text, 55)).toBe("Filed in the U.S. and in Canada on the same day.");
  });

  it("does not mistake an initial or a title for the end of a sentence", () => {
    expect(excerpt("Argued by J. Whitcombe before the court. And won.", 42)).toBe(
      "Argued by J. Whitcombe before the court.",
    );
    expect(excerpt("Met with Dr. Osei about the estate plan. She agreed.", 45)).toBe(
      "Met with Dr. Osei about the estate plan.",
    );
  });

  it("breaks on a word when one sentence outruns the budget by itself", () => {
    const runOn = "A single sentence that simply keeps going and going without ever stopping";

    const result = excerpt(runOn, 30);

    expect(result).toBe("A single sentence that simply…");
    // The ellipsis is the honest signal here: there was no sentence to cut at.
    expect(result.length).toBeLessThanOrEqual(31);
  });

  it("does not return a stub when the first sentence is very short", () => {
    // "Yes." fits, but an excerpt of "Yes." tells a reader nothing — so the
    // whole-word fallback is preferred over a technically-correct sentence cut.
    const text = "Yes. And then a far longer explanation of what that actually meant in practice.";

    expect(excerpt(text, 40)).toBe("Yes. And then a far longer explanation…");
  });

  it("is not fooled by a decimal point or a version number", () => {
    const text = "The threshold is 0.08 in both countries. Enforcement differs.";

    expect(excerpt(text, 45)).toBe("The threshold is 0.08 in both countries.");
  });

  it("collapses the whitespace a multi-line source string carries", () => {
    expect(excerpt("Wrapped over\n  two lines.", 200)).toBe("Wrapped over two lines.");
  });
});
