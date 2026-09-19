import { describe, expect, it, vi } from "vitest";

// The real config would tie these assertions to whichever client repo this
// file happens to sit in, and test files do not diverge between repos
// (CLAUDE.md Conventions). Pinned to CAD so the expectations below are about
// the formatter rather than about one business's currency.
vi.mock("@/config/site.config", () => ({
  siteConfig: { business: { currency: "CAD" } },
}));

const { formatMajorUnits, formatMoney, stripeCurrency } = await import("./money");

/**
 * Intl inserts U+00A0 (a non-breaking space) between symbol and number for
 * some currencies. Normalising here keeps the assertions readable rather than
 * making every expected string carry an invisible character.
 */
const normalise = (value: string) => value.replace(/\u00a0/g, " ");

describe("formatMoney", () => {
  it("formats minor units as an amount", () => {
    expect(normalise(formatMoney(3250))).toBe("$32.50");
  });

  it("keeps trailing zeroes, because a price is not a number", () => {
    // "$32" reads as an approximation; "$32.00" reads as a price.
    expect(normalise(formatMoney(3200))).toBe("$32.00");
  });

  it("handles zero", () => {
    expect(normalise(formatMoney(0))).toBe("$0.00");
  });

  it("marks a foreign currency and leaves the local one plain", () => {
    // The whole point of pinning en-CA: the business's own currency reads
    // plainly, a foreign one is disambiguated rather than rendering as a bare
    // dollar sign that could be either.
    expect(normalise(formatMoney(3250, "CAD"))).toBe("$32.50");
    expect(normalise(formatMoney(3250, "USD"))).toBe("US$32.50");
  });

  it("formats a non-dollar currency", () => {
    expect(normalise(formatMoney(3250, "GBP"))).toBe("£32.50");
  });

  it("throws on a non-integer rather than rounding it", () => {
    // A float here means someone passed dollars where cents were expected.
    // Silently rounding turns $32.50 into $0.33 with no signal at all.
    expect(() => formatMoney(32.5)).toThrow(TypeError);
  });

  it("does not lose a cent to floating point", () => {
    // The reason everything is integers: 0.1 + 0.2 !== 0.3. Adding in minor
    // units and formatting once at the edge is what keeps a total reconcilable.
    const total = 1010 + 2020 + 3030;
    expect(normalise(formatMoney(total))).toBe("$60.60");
  });
});

describe("formatMajorUnits", () => {
  it("formats whole dollars from the content schema's price fields", () => {
    expect(normalise(formatMajorUnits(89))).toBe("$89.00");
  });

  it("formats a four-figure price with a thousands separator", () => {
    expect(normalise(formatMajorUnits(3500))).toBe("$3,500.00");
  });
});

describe("stripeCurrency", () => {
  it("lower-cases the code, because Stripe rejects upper case", () => {
    // A 400 at the till rather than a type error at build time, which is
    // exactly the failure a customer discovers for you.
    expect(stripeCurrency()).toBe("cad");
    expect(stripeCurrency("USD")).toBe("usd");
  });
});
