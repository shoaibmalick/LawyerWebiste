import { describe, expect, it } from "vitest";
import { escapeHtml, sanitiseSubject } from "./html";

describe("escapeHtml", () => {
  /**
   * The finding this exists for. A contact-form message went straight into the
   * HTML body of an email sent from the practice's own domain — so an attacker
   * could put a working link in front of staff who trust the sender.
   */
  it("defuses an anchor tag in a contact-form message", () => {
    const message = '<a href="https://evil.test">Confirm your appointment</a>';

    const escaped = escapeHtml(message);

    expect(escaped).not.toContain("<a");
    expect(escaped).toContain("&lt;a");
    expect(escaped).toContain("&quot;");
  });

  it("defuses an image tag with an event handler", () => {
    expect(escapeHtml("<img src=x onerror=alert(1)>")).toBe("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("escapes every character that can break out of markup", () => {
    expect(escapeHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("escapes the ampersand first, so entities are not double-escaped", () => {
    // Chained replaces in the wrong order turn "<" into "&amp;lt;".
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("leaves ordinary text exactly as it was", () => {
    // Staff read these emails. Over-escaping a real name is its own bug.
    expect(escapeHtml("Priya Nair")).toBe("Priya Nair");
    expect(escapeHtml("O'Brien")).toBe("O&#39;Brien");
    expect(escapeHtml("905-555-0148")).toBe("905-555-0148");
  });

  it("renders an absent value as nothing rather than 'undefined'", () => {
    // customerPhone is nullable and goes straight into a template.
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(null)).toBe("");
  });
});

describe("sanitiseSubject", () => {
  it("removes anything that could start a new header line", () => {
    const injected = "Jane\r\nBcc: attacker@evil.test";

    expect(sanitiseSubject(injected)).toBe("Jane Bcc: attacker@evil.test");
    expect(sanitiseSubject(injected)).not.toMatch(/[\r\n]/);
  });

  it("keeps hyphens and ordinary punctuation", () => {
    // An earlier version of the regex read as "space through hyphen" and
    // stripped every hyphen from every subject line.
    expect(sanitiseSubject("New booking — routine clean, 905-555-0148")).toBe(
      "New booking — routine clean, 905-555-0148",
    );
  });

  it("collapses the whitespace it leaves behind", () => {
    expect(sanitiseSubject("Jane\r\n\r\nDoe")).toBe("Jane Doe");
  });
});
