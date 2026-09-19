import { describe, expect, it } from "vitest";
import { createBookingSchema } from "./booking.schema";

describe("createBookingSchema", () => {
  const base = {
    slotId: "slot_123",
    serviceSlug: "checkup",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
  };

  it("accepts valid input without a phone", () => {
    expect(createBookingSchema.safeParse(base).success).toBe(true);
  });

  it("accepts valid input with a phone in the practice's format", () => {
    expect(
      createBookingSchema.safeParse({ ...base, customerPhone: "(905)-555-0148" }).success,
    ).toBe(true);
  });

  /**
   * Deliberate change: this used to accept `555-0100`. One format everywhere
   * the public types a number means a receptionist can dial anything in the
   * dashboard without first working out what shape it is in. See lib/phone.ts.
   */
  it("rejects a phone that is not in that format", () => {
    for (const phone of ["555-0100", "9055550148", "(905) 555-0148"]) {
      expect(createBookingSchema.safeParse({ ...base, customerPhone: phone }).success, phone).toBe(
        false,
      );
    }
  });

  it("still treats the phone as optional", () => {
    expect(createBookingSchema.safeParse({ ...base, customerPhone: "" }).success).toBe(true);
    expect(createBookingSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(createBookingSchema.safeParse({ ...base, customerEmail: "not-an-email" }).success).toBe(
      false,
    );
  });

  it("rejects an empty slotId", () => {
    expect(createBookingSchema.safeParse({ ...base, slotId: "" }).success).toBe(false);
  });

  it("rejects an empty customerName", () => {
    expect(createBookingSchema.safeParse({ ...base, customerName: "" }).success).toBe(false);
  });

  // The service is the customer's choice now that a slot is a unit of the
  // business's time rather than of one service, so it must be supplied.
  it("rejects a missing serviceSlug", () => {
    const { serviceSlug: _omitted, ...withoutService } = base;
    expect(createBookingSchema.safeParse(withoutService).success).toBe(false);
  });

  it("rejects an empty serviceSlug", () => {
    expect(createBookingSchema.safeParse({ ...base, serviceSlug: "" }).success).toBe(false);
  });
});
