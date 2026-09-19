import { beforeEach, describe, expect, it, vi } from "vitest";

// Same reasoning as calculate-estimate.test.ts: this module reads per-client
// content directly, so it gets a self-contained fixture rather than whatever
// a given client repo's services happen to be.
vi.mock("@/config/content/services", () => ({
  services: [
    {
      slug: "whitening",
      name: "Whitening",
      description: "A fixture service.",
      durationMinutes: 60,
      priceFrom: 100,
    },
  ],
}));

vi.mock("@/config/content/quote-factors", () => ({
  quoteFactors: [{ serviceSlug: "whitening", factors: [] }],
}));

const sendEmail = vi.fn(async () => ({ delivered: true as const, provider: "RESEND" as const }));
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...(args as [])),
}));

const createLead = vi.fn(async (input: Record<string, unknown>) => ({ id: "lead_1", ...input }));
vi.mock("@/server/services/leadService", () => ({
  leadService: { createLead: (input: Record<string, unknown>) => createLead(input) },
}));

import { submitQuoteRequest } from "./submit-quote-request";

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

function lastEmailHtml(): string {
  const call = sendEmail.mock.calls.at(-1) as unknown as [{ html: string }] | undefined;
  return call?.[0]?.html ?? "";
}

beforeEach(() => {
  sendEmail.mockClear();
  createLead.mockClear();
});

describe("submitQuoteRequest — outbound email escaping", () => {
  /**
   * The finding this test exists for.
   *
   * `phone` was `z.string().max(30)`, and 30 characters is enough for
   * `<a href=//evil.test>Pay</a>`. Interpolated raw, that is a working link in
   * a message sent from the business's own domain — the same defect the
   * 2026-08-06 review logged as H1 against a different template.
   *
   * The schema now rejects that shape, but this asserts the service escapes
   * regardless: a schema is one caller's guarantee, not the service's.
   */
  it("escapes a phone number carrying markup", async () => {
    await submitQuoteRequest({
      serviceSlug: "whitening",
      selections: {},
      name: "Ada",
      email: "ada@example.com",
      phone: '<a href="//evil.test">Pay</a>',
    });

    const html = lastEmailHtml();
    expect(html).not.toContain("<a href");
    expect(html).toContain("&lt;a href");
  });

  it("escapes an email address carrying markup", async () => {
    await submitQuoteRequest({
      serviceSlug: "whitening",
      selections: {},
      name: "Ada",
      email: '<img src=x onerror="alert(1)">@example.com',
      phone: undefined,
    });

    const html = lastEmailHtml();
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("escapes the customer name", async () => {
    await submitQuoteRequest({
      serviceSlug: "whitening",
      selections: {},
      name: "<script>alert(1)</script>",
      email: "ada@example.com",
      phone: undefined,
    });

    expect(lastEmailHtml()).not.toContain("<script>");
  });

  it("still renders the estimate as real markup, not escaped tags", async () => {
    await submitQuoteRequest({
      serviceSlug: "whitening",
      selections: {},
      name: "Ada",
      email: "ada@example.com",
      phone: undefined,
    });

    // plainTextToHtml escapes *then* inserts <br />. Inverting that order
    // escapes the tag instead of the content, which is the bug lib/email-
    // shell.ts is built to make impossible — so assert the break survived.
    const html = lastEmailHtml();
    expect(html).toContain("<br />");
    expect(html).not.toContain("&lt;br");
  });
});
