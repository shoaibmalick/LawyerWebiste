import { describe, expect, it } from "vitest";
import { quoteFactorSchema } from "./quote.schema";

describe("quoteFactorSchema", () => {
  it("accepts a valid boolean factor", () => {
    const result = quoteFactorSchema.safeParse({
      type: "boolean",
      id: "rush",
      label: "Rush job",
      price: 50,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid quantity factor", () => {
    const result = quoteFactorSchema.safeParse({
      type: "quantity",
      id: "rooms",
      label: "Number of rooms",
      pricePerUnit: 25,
      minUnits: 1,
      maxUnits: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a quantity factor missing pricePerUnit", () => {
    const result = quoteFactorSchema.safeParse({
      type: "quantity",
      id: "rooms",
      label: "Number of rooms",
      minUnits: 1,
      maxUnits: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown discriminant", () => {
    const result = quoteFactorSchema.safeParse({
      type: "percentage",
      id: "discount",
      label: "Discount",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a boolean factor with a non-numeric price", () => {
    const result = quoteFactorSchema.safeParse({
      type: "boolean",
      id: "rush",
      label: "Rush job",
      price: "fifty",
    });
    expect(result.success).toBe(false);
  });
});
