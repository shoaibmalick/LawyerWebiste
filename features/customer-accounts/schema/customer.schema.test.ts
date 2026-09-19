import { describe, expect, it } from "vitest";
import { signupSchema } from "./customer.schema";

describe("signupSchema", () => {
  const base = { name: "Jane Doe", email: "jane@example.com", password: "correcthorse" };

  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(signupSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(signupSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(signupSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });
});
