import { describe, expect, it, vi } from "vitest";

// See app/api/leads/route.test.ts for why these three mocks exist. The short
// version: headers() needs Next's request-scoped context, the address must be
// IP-shaped because lib/client-ip.ts ignores anything that is not, and the
// feature barrel drags in @/auth -> next-auth, whose ESM output Vitest's
// resolver cannot follow.
let ipCounter = 0;
vi.mock("next/headers", () => ({
  headers: vi.fn(
    async () => new Headers({ "x-forwarded-for": `10.4.0.${(ipCounter += 1) % 255}` }),
  ),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

const isFeatureEnabled = vi.fn(() => true);
vi.mock("@/lib/features", () => ({
  isFeatureEnabled: (...args: unknown[]) => isFeatureEnabled(...(args as [])),
}));

// Keep the real schema — it is half of what is under test — but stub the
// service so this stays a route test and never reaches the database.
const submitQuoteRequest = vi.fn(async () => ({
  lead: { id: "lead_1" },
  estimate: { serviceName: "Whitening", basePrice: 100, lineItems: [], total: 100 },
}));
vi.mock("@/features/quote-calculator", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, submitQuoteRequest: () => submitQuoteRequest() };
});

import { POST } from "./route";

const VALID = {
  serviceSlug: "whitening",
  selections: {},
  name: "Ada",
  email: "ada@example.com",
};

function post(body: unknown, init: RequestInit = {}) {
  return POST(
    new Request("http://localhost/api/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      ...init,
    }),
  );
}

describe("POST /api/quote", () => {
  it("404s when the feature is disabled", async () => {
    isFeatureEnabled.mockReturnValueOnce(false);
    expect((await post(VALID)).status).toBe(404);
  });

  /**
   * The CSRF hole. `request.json()` parses whatever arrives regardless of
   * Content-Type, so a form with enctype="text/plain" on an attacker's page is
   * a *simple* request: the browser sends it with the visitor's cookies and no
   * preflight. Requiring application/json forces a preflight, which fails.
   */
  it("refuses a body that is not declared application/json", async () => {
    const response = await POST(
      new Request("http://localhost/api/quote", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify(VALID),
      }),
    );
    expect(response.status).toBe(415);
  });

  it("answers malformed JSON with 400 rather than throwing a 500", async () => {
    const response = await POST(
      new Request("http://localhost/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("refuses an oversized body", async () => {
    const response = await post({ ...VALID, name: "A".repeat(200 * 1024) });
    expect(response.status).toBe(413);
  });

  /**
   * Zod's `issues` array names every field, its type and its constraints — a
   * free map of the server's data model for an unauthenticated caller.
   */
  it("does not hand back Zod's issues array on a validation failure", async () => {
    const response = await post({ serviceSlug: "whitening" });
    expect(response.status).toBe(400);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("issues");
    expect(body.detail).toBeTypeOf("string");
  });

  it("rejects a phone that is not in the one supported format", async () => {
    const response = await post({ ...VALID, phone: '<a href="//evil.test">Pay</a>' });
    expect(response.status).toBe(400);
  });

  it("accepts a well-formed request", async () => {
    const response = await post({ ...VALID, phone: "(212)-456-7890" });
    expect(response.status).toBe(201);
  });
});
