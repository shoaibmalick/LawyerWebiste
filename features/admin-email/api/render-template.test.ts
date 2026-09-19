import { describe, expect, it } from "vitest";
import { renderTemplate } from "./render-template";

describe("renderTemplate", () => {
  it("substitutes a known placeholder", () => {
    expect(renderTemplate("Hi {{customer_name}},", { customer_name: "Jane" })).toBe("Hi Jane,");
  });

  it("substitutes every occurrence", () => {
    expect(
      renderTemplate("{{business_name}} — {{business_name}}", { business_name: "Test Practice" }),
    ).toBe("Test Practice — Test Practice");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(renderTemplate("Hi {{ customer_name }},", { customer_name: "Jane" })).toBe("Hi Jane,");
  });

  /**
   * The schema rejects unknown placeholders in the shipped templates, so this
   * only happens for text a person typed — in which case leaving it alone is
   * the honest answer. Silently deleting it would make the staff member think
   * she had mistyped rather than used something that does not exist.
   */
  it("leaves an unknown placeholder untouched", () => {
    expect(renderTemplate("On {{appointment_date}}.", { customer_name: "Jane" })).toBe(
      "On {{appointment_date}}.",
    );
  });

  it("leaves a placeholder alone when its value is missing", () => {
    expect(renderTemplate("Hi {{customer_name}},", {})).toBe("Hi {{customer_name}},");
  });

  /**
   * One pass, not repeated expansion. Otherwise a value containing braces
   * becomes a second round of substitution nobody asked for.
   */
  it("does not re-expand a value that itself contains a placeholder", () => {
    expect(
      renderTemplate("Hi {{customer_name}},", {
        customer_name: "{{business_name}}",
        business_name: "Test Practice",
      }),
    ).toBe("Hi {{business_name}},");
  });

  /**
   * No escaping here. The result is plain text that goes into a textarea and is
   * escaped exactly once, later, in the shell — doing it twice is the
   * double-escaping bug CLAUDE.md warns about.
   */
  it("does not escape the values it substitutes", () => {
    expect(renderTemplate("From {{business_name}}", { business_name: "Reid & Sons" })).toBe(
      "From Reid & Sons",
    );
  });

  it("returns text with no placeholders unchanged", () => {
    expect(renderTemplate("Nothing to fill in here.", { customer_name: "Jane" })).toBe(
      "Nothing to fill in here.",
    );
  });

  it("handles an empty string", () => {
    expect(renderTemplate("", { customer_name: "Jane" })).toBe("");
  });
});
