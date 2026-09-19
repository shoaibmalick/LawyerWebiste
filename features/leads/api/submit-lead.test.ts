import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.hoisted(() => vi.fn(async () => {}));
const createLead = vi.hoisted(() => vi.fn(async () => ({ id: "lead_1" })));

vi.mock("@/lib/email", () => ({ sendEmail }));
vi.mock("@/server/services/leadService", () => ({ leadService: { createLead } }));
vi.mock("@/config/site.config", () => ({
  siteConfig: { business: { name: "Test Practice", email: "hello@practice.test" } },
}));

import { submitLead } from "./submit-lead";

/**
 * The feature barrel this imports from also re-exports admin Server Actions,
 * which import @/auth -> next-auth, whose ESM output Vitest's resolver chokes
 * on ("Cannot find module .../next/server"). Mock it out; nothing here calls
 * auth(). See the mocking note in CLAUDE.md.
 */
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

const lead = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "905-555-0199",
  message: "Do you take new patients?",
};

beforeEach(() => {
  sendEmail.mockClear();
  createLead.mockClear();
});

function sentHtml(): string {
  const call = sendEmail.mock.calls.at(0)?.at(0) as { html: string } | undefined;
  if (!call) throw new Error("no email was sent");
  return call.html;
}

describe("submitLead", () => {
  it("emails the practice with the enquiry", async () => {
    await submitLead(lead);

    expect(createLead).toHaveBeenCalledWith(lead);
    expect(sentHtml()).toContain("Do you take new patients?");
    expect(sentHtml()).toContain("jane@example.com");
  });

  /**
   * The headline finding of the security review. `message` is unconstrained
   * free text from an anonymous form, and it was interpolated raw into the
   * HTML body of an email sent from the practice's own domain. Mail clients
   * block script but render links and images perfectly well, so this was a
   * phishing primitive aimed at staff, not a theoretical XSS.
   */
  it("neutralises markup in the message rather than sending it live", async () => {
    await submitLead({
      ...lead,
      message: '<a href="https://evil.test">click</a><img src=x onerror=1>',
    });

    const html = sentHtml();

    expect(html).not.toContain("<a href");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;");
    expect(html).toContain("&lt;img src=x onerror=1&gt;");
  });

  it("neutralises markup in the name and phone too", async () => {
    await submitLead({
      ...lead,
      name: "<script>alert(1)</script>",
      phone: '"><b>x</b>',
    });

    const html = sentHtml();

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("omits the phone line entirely when none was given", async () => {
    await submitLead({ ...lead, phone: undefined });

    expect(sentHtml()).toContain("(jane@example.com)");
  });
});
