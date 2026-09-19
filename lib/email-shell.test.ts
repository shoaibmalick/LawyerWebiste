import { describe, expect, it, vi } from "vitest";
import { emailPlainText, emailShell, plainTextToHtml } from "./email-shell";

/**
 * Fixture rather than this client's real config, per CLAUDE.md: test files do
 * not diverge between repos, so asserting on "Acme Dental" would fail
 * in every other client.
 */
vi.mock("@/config/site.config", () => ({
  siteConfig: {
    business: {
      name: "Test Practice",
      phone: "(555) 000-1111",
      address: {
        street: "1 Test Street",
        city: "Testville",
        state: "ON",
        zip: "A1A 1A1",
        country: "CA",
      },
    },
  },
}));

describe("plainTextToHtml", () => {
  /**
   * The one ordering that matters. Escaping after inserting <br /> escapes the
   * <br /> too, and the customer reads the tag instead of seeing a line break.
   */
  it("escapes before it adds markup", () => {
    const html = plainTextToHtml("Line one\nLine two");

    expect(html).toContain("<br />");
    expect(html).not.toContain("&lt;br /&gt;");
  });

  /**
   * The reason this function exists rather than the body being interpolated
   * directly. A link typed into the compose box must not become a working link
   * in a message carrying the business's own SPF and DKIM.
   */
  it("renders an anchor typed by an admin as literal text", () => {
    const html = plainTextToHtml('<a href="https://evil.test">Confirm your appointment</a>');

    expect(html).not.toContain("<a href");
    expect(html).toContain("&lt;a href=");
    expect(html).toContain("evil.test");
  });

  /**
   * The property is "no tag the admin typed survives as a tag", not "the words
   * disappear". `onerror=` reading back as literal text inside an escaped
   * `&lt;img` is the correct outcome — there is no element for it to attach to.
   */
  it.each([
    ["a script tag", "<script>alert(1)</script>"],
    ["an img onerror", '<img src=x onerror="alert(1)">'],
    ["an ampersand", "Reid & Sons"],
    ["quotes", `She said "hello"`],
  ])("escapes %s", (_label, input) => {
    const html = plainTextToHtml(input);
    const body = html.replace(/^<p style="[^"]*">/, "").replace(/<\/p>$/, "");

    expect(body).not.toMatch(/<[a-zA-Z/]/);
  });

  it("starts a new paragraph on a blank line", () => {
    const html = plainTextToHtml("First para\n\nSecond para");

    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html).toContain("First para");
    expect(html).toContain("Second para");
  });

  it("treats a run of blank lines as one break", () => {
    expect(plainTextToHtml("A\n\n\n\nB").match(/<p /g)).toHaveLength(2);
  });

  it("normalises CRLF, so a Windows browser does not double every break", () => {
    expect(plainTextToHtml("A\r\nB")).toBe(plainTextToHtml("A\nB"));
  });

  it("drops empty paragraphs rather than rendering blank blocks", () => {
    expect(plainTextToHtml("\n\n\n")).toBe("");
    expect(plainTextToHtml("   ")).toBe("");
  });

  it("uses inline styles only, because a mail client discards the rest", () => {
    const html = plainTextToHtml("Hello");

    expect(html).toContain("style=");
    expect(html).not.toContain("class=");
  });
});

describe("emailShell", () => {
  it("wraps the body and adds the business's details", () => {
    const html = emailShell("<p>Body here</p>");

    expect(html).toContain("<p>Body here</p>");
    expect(html).toContain("Test Practice");
    expect(html).toContain("(555) 000-1111");
    expect(html).toContain("1 Test Street");
  });

  it("does not escape the body it is given, which is already markup", () => {
    // The shell takes assembled HTML — the booking templates build their own.
    // Escaping here would show every customer raw tags.
    expect(emailShell("<p>Hi <strong>Jane</strong></p>")).toContain("<strong>Jane</strong>");
  });

  it("carries no external stylesheet or style block", () => {
    const html = emailShell("<p>x</p>");

    expect(html).not.toContain("<style");
    expect(html).not.toContain("<link");
  });
});

describe("emailPlainText", () => {
  it("signs off with the business's name and number", () => {
    const text = emailPlainText("Hi Jane,\n\nSee you Tuesday.");

    expect(text).toContain("Hi Jane,");
    expect(text).toContain("Test Practice · (555) 000-1111");
  });

  it("carries no markup", () => {
    expect(emailPlainText("Hi Jane")).not.toContain("<");
  });
});
