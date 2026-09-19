import { describe, expect, it } from "vitest";
import { hasLeadFilters, parseLeadFilters } from "./lead-filters.schema";

describe("parseLeadFilters", () => {
  it("returns nothing to filter on for an empty query", () => {
    expect(parseLeadFilters({})).toEqual({});
  });

  it("treats a blank box as no filter", () => {
    // The form submits every field, so untouched boxes arrive as "". Matching
    // the empty string would return nothing and look like data loss.
    expect(parseLeadFilters({ name: "", email: "   ", phone: "" })).toEqual({});
  });

  it("trims what was typed", () => {
    expect(parseLeadFilters({ name: "  Priya  " })).toEqual({ name: "Priya" });
  });

  it("keeps several filters together", () => {
    expect(parseLeadFilters({ name: "Priya", email: "clinic", status: "NEW" })).toEqual({
      name: "Priya",
      email: "clinic",
      status: "NEW",
    });
  });

  it("accepts a status case-insensitively and drops an unknown one", () => {
    expect(parseLeadFilters({ status: "handled" })).toEqual({ status: "HANDLED" });
    expect(parseLeadFilters({ status: "ARCHIVED" })).toEqual({});
  });

  it("takes the first value when a key is repeated", () => {
    expect(parseLeadFilters({ name: ["Priya", "Marcus"] })).toEqual({ name: "Priya" });
  });

  it("drops an absurdly long term instead of passing it to the database", () => {
    // Guards against accident more than attack — the route is behind admin
    // auth — but an unbounded ILIKE pattern is not worth allowing for free.
    expect(parseLeadFilters({ name: "a".repeat(201) })).toEqual({});
    expect(parseLeadFilters({ name: "a".repeat(200) })).toEqual({ name: "a".repeat(200) });
  });
});

describe("hasLeadFilters", () => {
  it("tells the page whether to say 'matching' or just count", () => {
    expect(hasLeadFilters({})).toBe(false);
    expect(hasLeadFilters({ name: "Priya" })).toBe(true);
    expect(hasLeadFilters({ status: "NEW" })).toBe(true);
  });
});
