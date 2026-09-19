import { describe, expect, it } from "vitest";
import { emailTemplatesSchema, PLACEHOLDERS } from "./email-templates.schema";

/**
 * Asserted against fixtures rather than this client's real templates, per
 * CLAUDE.md: this file does not diverge between repos, so pinning it to one
 * client's copy would break in every other one.
 */
function template(overrides: Record<string, unknown> = {}) {
  return {
    key: "tried-to-reach-you",
    label: "We tried to reach you",
    appliesTo: ["booking"],
    subject: "We tried to reach you",
    body: "Hi {{customer_name}}, please call us on {{business_phone}}.",
    ...overrides,
  };
}

describe("emailTemplatesSchema", () => {
  it("accepts a template using known placeholders", () => {
    expect(emailTemplatesSchema.safeParse([template()]).success).toBe(true);
  });

  it("accepts every declared placeholder in a booking template", () => {
    const body = PLACEHOLDERS.map((name) => `{{${name}}}`).join(" ");
    expect(emailTemplatesSchema.safeParse([template({ body })]).success).toBe(true);
  });

  /**
   * The check that earns config its place over a table. A template naming a
   * placeholder the code does not supply would otherwise reach a customer as a
   * literal `{{appointment_date}}`, with nothing to catch it in between.
   */
  it("rejects an unknown placeholder", () => {
    const result = emailTemplatesSchema.safeParse([
      template({ body: "Your appointment on {{appointment_date}}." }),
    ]);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("appointment_date");
  });

  it("rejects an unknown placeholder in the subject too", () => {
    expect(
      emailTemplatesSchema.safeParse([template({ subject: "Hello {{customer_first_name}}" })])
        .success,
    ).toBe(false);
  });

  /**
   * A lead is a contact-form enquiry: no service, no appointment. A template
   * offering both would render "your appointment on " with nothing after it.
   */
  it.each(["service_name", "appointment_time"])(
    "rejects a lead template using the booking-only {{%s}}",
    (name) => {
      const result = emailTemplatesSchema.safeParse([
        template({ appliesTo: ["lead"], body: `About your {{${name}}}.` }),
      ]);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain(name);
    },
  );

  it("rejects a template that applies to both but uses a booking-only placeholder", () => {
    expect(
      emailTemplatesSchema.safeParse([
        template({ appliesTo: ["booking", "lead"], body: "On {{appointment_time}}." }),
      ]).success,
    ).toBe(false);
  });

  it("allows a booking-only placeholder in a booking-only template", () => {
    expect(
      emailTemplatesSchema.safeParse([
        template({ appliesTo: ["booking"], body: "On {{appointment_time}}." }),
      ]).success,
    ).toBe(true);
  });

  it("tolerates whitespace inside the braces", () => {
    expect(
      emailTemplatesSchema.safeParse([template({ body: "Hi {{ customer_name }}." })]).success,
    ).toBe(true);
  });

  it("rejects duplicate keys", () => {
    const result = emailTemplatesSchema.safeParse([template(), template()]);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Duplicate");
  });

  it("rejects a key that is not a slug", () => {
    expect(emailTemplatesSchema.safeParse([template({ key: "Tried To Reach You" })]).success).toBe(
      false,
    );
  });

  it("rejects an empty appliesTo", () => {
    expect(emailTemplatesSchema.safeParse([template({ appliesTo: [] })]).success).toBe(false);
  });

  it("rejects unknown fields, so a typo is not silently ignored", () => {
    expect(emailTemplatesSchema.safeParse([template({ bodyText: "oops" })]).success).toBe(false);
  });
});

describe("the shipped templates", () => {
  /**
   * Not an assertion about the copy — that is per-client and diverges. Only
   * that whatever this repo ships parses, which the module's own top-level
   * `parse` would already enforce at import; this makes the failure legible.
   */
  it("parse", async () => {
    const { emailTemplates } = await import("../content/email-templates");
    expect(emailTemplates.length).toBeGreaterThan(0);
  });
});
