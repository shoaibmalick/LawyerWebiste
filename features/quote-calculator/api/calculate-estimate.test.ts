import { describe, expect, it, vi } from "vitest";

// calculateEstimate reads config/content/services and config/content/quote-
// factors directly, which are per-client content (see CLAUDE.md's Template
// vs Client Repo section) — asserting against whatever a specific client's
// real content happens to contain broke this test the moment a client repo's
// services differed from the Acme Dental fixture (Smile Studio Dental has no
// "invisalign" slug at all). Mock both with a small self-contained fixture so
// this test exercises the pure math regardless of which client repo it runs in.
vi.mock("@/config/content/services", () => ({
  services: [
    {
      slug: "teeth-whitening",
      name: "Teeth Whitening",
      description: "In-office whitening treatment for a brighter smile in one visit.",
      durationMinutes: 60,
      priceFrom: 249,
    },
    {
      slug: "emergency-care",
      name: "Emergency Care",
      description: "Same-day appointments for toothaches, chips, and other dental emergencies.",
      durationMinutes: 30,
    },
    {
      slug: "invisalign",
      name: "Invisalign",
      description: "Clear aligner therapy to straighten teeth discreetly and comfortably.",
      durationMinutes: 30,
      priceFrom: 3500,
    },
  ],
}));

vi.mock("@/config/content/quote-factors", () => ({
  quoteFactors: [
    {
      serviceSlug: "teeth-whitening",
      factors: [
        {
          type: "boolean",
          id: "sensitive-teeth-treatment",
          label: "Sensitive-teeth treatment add-on",
          price: 40,
        },
      ],
    },
    {
      serviceSlug: "invisalign",
      factors: [
        {
          type: "quantity",
          id: "aligner-sets",
          label: "Number of aligner sets",
          pricePerUnit: 150,
          minUnits: 1,
          maxUnits: 6,
        },
        {
          type: "boolean",
          id: "retainers",
          label: "Include retainers after treatment",
          price: 200,
        },
      ],
    },
  ],
}));

const { calculateEstimate } = await import("./calculate-estimate");

describe("calculateEstimate", () => {
  it("returns null for an unknown service", () => {
    expect(calculateEstimate("does-not-exist", {})).toBeNull();
  });

  it("uses priceFrom as the base with no selections", () => {
    const estimate = calculateEstimate("teeth-whitening", {});
    expect(estimate).not.toBeNull();
    expect(estimate?.basePrice).toBe(249);
    expect(estimate?.lineItems).toEqual([]);
    expect(estimate?.total).toBe(249);
  });

  it("defaults basePrice to 0 for a service with no priceFrom", () => {
    const estimate = calculateEstimate("emergency-care", {});
    expect(estimate?.basePrice).toBe(0);
    expect(estimate?.total).toBe(0);
  });

  it("adds a boolean factor's price only when selected", () => {
    const unselected = calculateEstimate("teeth-whitening", {
      "sensitive-teeth-treatment": false,
    });
    expect(unselected?.total).toBe(249);

    const selected = calculateEstimate("teeth-whitening", {
      "sensitive-teeth-treatment": true,
    });
    expect(selected?.total).toBe(289); // 249 + 40
    expect(selected?.lineItems).toEqual([
      { label: "Sensitive-teeth treatment add-on", amount: 40 },
    ]);
  });

  it("multiplies a quantity factor by units within range", () => {
    const estimate = calculateEstimate("invisalign", { "aligner-sets": 2 });
    // 3500 base + 2 * 150 = 3800
    expect(estimate?.total).toBe(3800);
    expect(estimate?.lineItems).toEqual([{ label: "Number of aligner sets (2)", amount: 300 }]);
  });

  it("clamps a quantity factor to its configured max", () => {
    const estimate = calculateEstimate("invisalign", { "aligner-sets": 99 });
    // clamped to maxUnits (6): 3500 + 6 * 150 = 4400
    expect(estimate?.total).toBe(4400);
  });

  it("clamps a quantity factor to its configured min when below it", () => {
    const estimate = calculateEstimate("invisalign", { "aligner-sets": 0.5 });
    // clamped up to minUnits (1): 3500 + 1 * 150 = 3650
    expect(estimate?.total).toBe(3650);
  });

  it("ignores a zero or negative quantity selection entirely", () => {
    const estimate = calculateEstimate("invisalign", { "aligner-sets": 0 });
    expect(estimate?.lineItems).toEqual([]);
    expect(estimate?.total).toBe(3500);
  });

  it("combines multiple factors on the same service", () => {
    const estimate = calculateEstimate("invisalign", {
      "aligner-sets": 3,
      retainers: true,
    });
    // 3500 + 3*150 + 200 = 4150
    expect(estimate?.total).toBe(4150);
    expect(estimate?.lineItems).toHaveLength(2);
  });

  it("ignores an unrelated key and never trusts a client-submitted total", () => {
    // "total" isn't a real factor id on any service — proves the function
    // only ever derives its own total from known factors, never a passed-in value.
    const estimate = calculateEstimate("invisalign", { "aligner-sets": 1, total: 1 });
    expect(estimate?.total).toBe(3650);
  });
});
