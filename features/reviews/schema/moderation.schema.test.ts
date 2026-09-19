import { describe, expect, it } from "vitest";
import { parseReviewStatusParam } from "./moderation.schema";

/**
 * Query params are the one input here that a person can type by hand, and the
 * URL survives bookmarks and shared links. Every branch below is something a
 * real URL can contain.
 */
describe("parseReviewStatusParam", () => {
  it("defaults to the moderation queue when no status is given", () => {
    // Pending is the only view with work waiting in it, so it is what opening
    // /dashboard/reviews with no query should show.
    expect(parseReviewStatusParam(undefined)).toBe("PENDING");
  });

  it("treats a blank status as no status", () => {
    // "?status=" is what a form submits for an untouched select.
    expect(parseReviewStatusParam("")).toBe("PENDING");
    expect(parseReviewStatusParam("   ")).toBe("PENDING");
  });

  it("accepts each real status, case-insensitively", () => {
    expect(parseReviewStatusParam("PENDING")).toBe("PENDING");
    expect(parseReviewStatusParam("approved")).toBe("APPROVED");
    expect(parseReviewStatusParam("Hidden")).toBe("HIDDEN");
  });

  it("accepts ALL as the unfiltered view", () => {
    expect(parseReviewStatusParam("ALL")).toBe("ALL");
    expect(parseReviewStatusParam("all")).toBe("ALL");
  });

  it("takes the first value when a key is repeated", () => {
    // "?status=approved&status=hidden" arrives as an array, not a string.
    expect(parseReviewStatusParam(["approved", "hidden"])).toBe("APPROVED");
  });

  it("falls back rather than throwing on nonsense", () => {
    // A mistyped URL should show the admin something useful, not an error
    // page — there is nothing dangerous about guessing wrong here.
    expect(parseReviewStatusParam("REJECTED")).toBe("PENDING");
    expect(parseReviewStatusParam("'; DROP TABLE")).toBe("PENDING");
  });
});
