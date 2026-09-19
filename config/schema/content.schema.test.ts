import { describe, expect, it } from "vitest";
import { galleryImageSchema, serviceSchema, testimonialSchema } from "./content.schema";

describe("serviceSchema", () => {
  const base = {
    slug: "checkup",
    name: "Checkup",
    description: "A routine checkup.",
    durationMinutes: 30,
  };

  it("accepts a service with no priceFrom or depositAmount", () => {
    expect(serviceSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a service with depositAmount set", () => {
    expect(serviceSchema.safeParse({ ...base, depositAmount: 10000 }).success).toBe(true);
  });

  it("rejects a zero or negative depositAmount", () => {
    expect(serviceSchema.safeParse({ ...base, depositAmount: 0 }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...base, depositAmount: -100 }).success).toBe(false);
  });

  it("rejects a non-integer depositAmount (must be whole cents)", () => {
    expect(serviceSchema.safeParse({ ...base, depositAmount: 99.5 }).success).toBe(false);
  });

  it("rejects a non-positive durationMinutes", () => {
    expect(serviceSchema.safeParse({ ...base, durationMinutes: 0 }).success).toBe(false);
  });

  it("accepts a service with no category", () => {
    expect(serviceSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a service with a category", () => {
    expect(serviceSchema.safeParse({ ...base, category: "Colour" }).success).toBe(true);
  });

  it("rejects an empty category", () => {
    expect(serviceSchema.safeParse({ ...base, category: "" }).success).toBe(false);
  });
});

describe("galleryImageSchema", () => {
  const base = { src: "/images/gallery/01.jpg", alt: "Long hair with caramel balayage" };

  it("accepts an image without a caption", () => {
    expect(galleryImageSchema.safeParse(base).success).toBe(true);
  });

  it("accepts an image with a caption", () => {
    expect(galleryImageSchema.safeParse({ ...base, caption: "Four hours." }).success).toBe(true);
  });

  it("rejects empty alt text", () => {
    expect(galleryImageSchema.safeParse({ ...base, alt: "" }).success).toBe(false);
  });

  it("rejects a missing src", () => {
    expect(galleryImageSchema.safeParse({ alt: "Something" }).success).toBe(false);
  });
});

describe("testimonialSchema", () => {
  it("accepts a testimonial without a rating", () => {
    const result = testimonialSchema.safeParse({ authorName: "Sam", quote: "Great service." });
    expect(result.success).toBe(true);
  });

  it("rejects a rating outside 1-5", () => {
    expect(
      testimonialSchema.safeParse({ authorName: "Sam", quote: "Great!", rating: 6 }).success,
    ).toBe(false);
    expect(
      testimonialSchema.safeParse({ authorName: "Sam", quote: "Great!", rating: 0 }).success,
    ).toBe(false);
  });
});
