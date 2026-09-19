import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { headers } from "next/headers";
import { findService, listPracticeAreas } from "@/config/content/practice-areas";
import { prisma } from "@/lib/prisma";

// Route handlers call next/headers::headers(), which needs Next's
// request-scoped async context — unavailable when calling the handler
// directly in a test. Mock it with a unique simulated IP per call so
// unrelated tests never collide in the shared in-memory rate limiter.
//
// The address has to be *IP-shaped*: lib/client-ip.ts now ignores header
// values that are not addresses, because accepting arbitrary client text as a
// limiter key is what let an attacker mint a fresh quota per request.
let ipCounter = 0;
vi.mock("next/headers", () => ({
  headers: vi.fn(
    async () => new Headers({ "x-forwarded-for": `10.0.0.${(ipCounter += 1) % 255}` }),
  ),
}));

// The route imports from the feature's barrel (features/leads), which also
// exports markLeadHandledAction (unused here) — that pulls in @/auth ->
// next-auth, whose ESM output Vitest's resolver chokes on ("Cannot find
// module .../next/server"). Mock it out; this route doesn't call auth().
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

import { POST } from "./route";

const JSON_HEADERS = { "content-type": "application/json" };

function post(body: unknown, init: RequestInit = {}) {
  return POST(
    new Request("http://localhost/api/leads", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
      ...init,
    }),
  );
}

describe("POST /api/leads", () => {
  beforeEach(async () => {
    await prisma.lead.deleteMany();
  });

  afterAll(async () => {
    await prisma.lead.deleteMany();
    await prisma.$disconnect();
  });

  it("returns 400 for invalid input", async () => {
    const response = await post({ name: "", email: "not-an-email", message: "" });
    expect(response.status).toBe(400);
  });

  it("does not hand back the whole validation schema on a 400", async () => {
    // Zod's `issues` array names every field, its type and its constraints —
    // a free map of the server's data model for an anonymous caller.
    const response = await post({ name: "", email: "not-an-email", message: "" });
    const body = await response.json();

    expect(body.issues).toBeUndefined();
    expect(typeof body.error).toBe("string");
  });

  /* ------------------------------------------------------------------ *
   * Practice-area context.
   *
   * These fields arrive from a query string and hidden inputs, so every one
   * of them is attacker-controlled. The schema only proves they look like
   * slugs; submit-lead.ts is what proves they name something real.
   * ------------------------------------------------------------------ */

  const VALID = { name: "Jane", email: "jane@example.com", message: "I need help." };

  it("files a lead against the service it came from", async () => {
    const area = listPracticeAreas("individual")[0];
    const service = area.services[0];

    const response = await post({ ...VALID, serviceSlug: service.slug });
    expect(response.status).toBe(201);

    const stored = await prisma.lead.findFirstOrThrow();
    expect(stored.serviceSlug).toBe(service.slug);
    expect(stored.practiceAreaSlug).toBe(area.slug);
    expect(stored.audience).toBe("individual");
  });

  it("discards a well-formed slug that names no service", async () => {
    // The shape is valid, so the schema passes it. Only the content lookup can
    // reject it — and it has to, because this string reaches the firm's inbox
    // and dashboard labelled "practice area".
    expect(findService("totally-made-up-service")).toBeUndefined();

    const response = await post({ ...VALID, serviceSlug: "totally-made-up-service" });
    expect(response.status).toBe(201);

    const stored = await prisma.lead.findFirstOrThrow();
    expect(stored.serviceSlug).toBeNull();
    expect(stored.practiceAreaSlug).toBeNull();
  });

  it("rejects a slug that is not slug-shaped at the schema boundary", async () => {
    const response = await post({ ...VALID, serviceSlug: "<script>alert(1)</script>" });
    expect(response.status).toBe(400);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("derives audience from the service, ignoring what the request claimed", async () => {
    // A form post can claim anything. An individual-side service filed as a
    // business lead would land in the wrong lawyer's queue, and nothing
    // downstream would question it.
    const area = listPracticeAreas("individual")[0];

    const response = await post({
      ...VALID,
      serviceSlug: area.services[0].slug,
      audience: "business",
      practiceAreaSlug: "corporate-commercial",
    });
    expect(response.status).toBe(201);

    const stored = await prisma.lead.findFirstOrThrow();
    expect(stored.audience).toBe("individual");
    expect(stored.practiceAreaSlug).toBe(area.slug);
  });

  it("drops a category that does not belong to the audience claimed", async () => {
    // /business + a family-law category is a pair that cannot exist.
    const response = await post({
      ...VALID,
      audience: "business",
      practiceAreaSlug: listPracticeAreas("individual")[0].slug,
    });
    expect(response.status).toBe(201);

    const stored = await prisma.lead.findFirstOrThrow();
    expect(stored.practiceAreaSlug).toBeNull();
  });

  it("accepts a category on its own, with no service", async () => {
    const area = listPracticeAreas("business")[0];

    const response = await post({
      ...VALID,
      audience: "business",
      practiceAreaSlug: area.slug,
      jurisdiction: "BOTH",
    });
    expect(response.status).toBe(201);

    const stored = await prisma.lead.findFirstOrThrow();
    expect(stored.practiceAreaSlug).toBe(area.slug);
    expect(stored.serviceSlug).toBeNull();
    expect(stored.jurisdiction).toBe("BOTH");
  });

  it("rejects an unknown jurisdiction rather than storing it", async () => {
    const response = await post({ ...VALID, jurisdiction: "MX" });
    expect(response.status).toBe(400);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("accepts empty strings from unselected dropdowns", async () => {
    /*
     * Regression, and the worst kind: silent.
     *
     * An unselected `<select>` submits `""`, not `undefined`. The fields were
     * `slugSchema.optional()`, and `.optional()` only permits *absent* — a
     * present empty string still had to satisfy the kebab-case regex, and did
     * not. These fields have no error message of their own, so the resolver
     * blocked the submit, rendered nothing, and the button appeared dead.
     *
     * The default path — leave both dropdowns alone and write a message — was
     * the broken one, which is why it survived a browser test that filled them
     * in.
     */
    const response = await post({
      ...VALID,
      audience: "",
      practiceAreaSlug: "",
      serviceSlug: "",
      jurisdiction: "",
    });
    expect(response.status).toBe(201);

    const stored = await prisma.lead.findFirstOrThrow();
    expect(stored.audience).toBeNull();
    expect(stored.practiceAreaSlug).toBeNull();
    expect(stored.serviceSlug).toBeNull();
    expect(stored.jurisdiction).toBeNull();
  });

  it("still rejects a non-empty value that is not a valid slug", async () => {
    // The empty-string allowance must not become a hole: "" is normalised to
    // undefined, anything else still has to be slug-shaped.
    expect((await post({ ...VALID, practiceAreaSlug: "Not A Slug" })).status).toBe(400);
    expect((await post({ ...VALID, jurisdiction: "nowhere" })).status).toBe(400);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("still accepts a lead with no context at all", async () => {
    // The commonest case, and the one that must not become harder: somebody
    // who does not know which category their problem belongs to.
    const response = await post(VALID);
    expect(response.status).toBe(201);

    const stored = await prisma.lead.findFirstOrThrow();
    expect(stored.audience).toBeNull();
    expect(stored.practiceAreaSlug).toBeNull();
    expect(stored.serviceSlug).toBeNull();
  });

  it("creates a lead and returns 201 for valid input", async () => {
    const response = await post({
      name: "Jane",
      email: "jane@example.com",
      message: "Do you take walk-ins?",
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.lead.status).toBe("NEW");
  });

  /**
   * `request.json()` parses any body regardless of Content-Type, which made
   * this route writable from another origin: a form with
   * `enctype="text/plain"` is a *simple* request, so the browser sends it with
   * no preflight to refuse. Requiring application/json forces the preflight.
   */
  it("rejects a body that is not declared as JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ name: "Mallory", email: "m@example.com", message: "hi" }),
      }),
    );

    expect(response.status).toBe(415);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("answers 400 rather than 500 when the body is not valid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: JSON_HEADERS,
        body: "{ this is not json",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects an oversized body before parsing it", async () => {
    const response = await post({
      name: "Jane",
      email: "jane@example.com",
      message: "x".repeat(200 * 1024),
    });

    expect(response.status).toBe(413);
    expect(await prisma.lead.count()).toBe(0);
  });

  /**
   * The point of a honeypot is that a bot gets no signal to adapt from. A 400
   * would tell the operator which request gave them away; an ordinary 201 with
   * nothing written tells them their spam is landing when it is not.
   */
  it("silently discards a submission with the honeypot filled", async () => {
    const response = await post({
      name: "Mallory",
      email: "spam@example.com",
      message: "Cheap watches",
      website: "https://spam.example",
    });

    expect(response.status).toBe(201);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("still accepts a submission that leaves the honeypot empty", async () => {
    // The failure mode worth caring about: a false positive here is a lost
    // enquiry nobody ever finds out about.
    for (const website of [undefined, "", "   "]) {
      await prisma.lead.deleteMany();

      const response = await post({
        name: "Jane",
        email: "jane@example.com",
        message: "Do you take new patients?",
        website,
      });

      expect(response.status).toBe(201);
      expect(await prisma.lead.count()).toBe(1);
    }
  });

  it("returns 429 once the per-IP rate limit is exceeded", async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7" }));

    const makeRequest = () => post({ name: "X", email: "x@example.com", message: "hi" });

    for (let i = 0; i < 5; i++) {
      const response = await makeRequest();
      expect(response.status).toBe(201);
    }

    const sixth = await makeRequest();
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get("Retry-After")).toBeTruthy();
  });

  /**
   * The bypass itself. Every route keyed on the raw `x-forwarded-for`, so
   * rotating it per request gave unlimited quota. The header is still how we
   * identify a caller — but only the platform-set variants are trusted, and a
   * value that is not an address is ignored rather than used as a fresh key.
   */
  it("cannot be bypassed by rotating a spoofed forwarded-for header", async () => {
    let attempt = 0;
    vi.mocked(headers).mockImplementation(async () => {
      attempt += 1;
      return new Headers({
        "x-vercel-forwarded-for": "198.51.100.42",
        "x-forwarded-for": `192.0.2.${attempt}`,
      });
    });

    const makeRequest = () => post({ name: "X", email: "x@example.com", message: "hi" });

    for (let i = 0; i < 5; i++) {
      expect((await makeRequest()).status).toBe(201);
    }

    // Before the fix each of these was a brand-new bucket.
    expect((await makeRequest()).status).toBe(429);
  });
});
