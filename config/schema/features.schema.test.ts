import { describe, expect, it } from "vitest";
import { featuresConfigSchema } from "./features.schema";

/**
 * These assertions are about the schema surviving a merge, not about which
 * features any particular client runs.
 */
describe("featuresConfigSchema", () => {
  it("parses a config that omits a flag entirely", () => {
    // The regression this exists for. Before the defaults, a client repo that
    // had not merged a newly added flag crashed on `featuresConfig.parse` at
    // module load — a blank page on the next render, in a repo nobody had
    // touched. Adding a flag must be safe for every un-merged client.
    const parsed = featuresConfigSchema.parse({ booking: true });

    expect(parsed.booking).toBe(true);
    expect(parsed.reviews).toBe(false);
    expect(parsed.payments).toBe(false);
  });

  it("parses an entirely empty config", () => {
    expect(() => featuresConfigSchema.parse({})).not.toThrow();
  });

  it("defaults every flag to off", () => {
    // Off rather than on: a feature that switches itself on across every
    // client the moment it merges is not a default, it is a deployment.
    const parsed = featuresConfigSchema.parse({});
    expect(Object.values(parsed).every((value) => value === false)).toBe(true);
  });

  it("still rejects a non-boolean", () => {
    // Defaulting must not turn into coercion — "false" is a common typo and
    // is truthy everywhere it matters.
    expect(() => featuresConfigSchema.parse({ booking: "false" })).toThrow();
  });
});
