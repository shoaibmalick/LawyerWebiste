import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";

/**
 * G1 — mass assignment through the Zod boundary into Prisma.
 *
 * Two assertions per case, and the second is the one that matters. A status
 * code says the request was refused; only reading the row back says the
 * injected value never landed. The previous review found a real bug precisely
 * because a test checked the row rather than the status.
 *
 * The privileged fields chosen are not arbitrary. `Lead.status` and
 * `Review.status` are **real columns**: if either were writable from a public
 * body, an attacker could file a lead as already handled so nobody rings them
 * back, or publish their own review straight onto the business's homepage
 * without moderation. `Booking.status` and `Booking.paid` are the equivalents
 * on the booking side — self-confirming an booking, or marking a deposit
 * paid that was never taken.
 */

let ipCounter = 0;
vi.mock("next/headers", () => ({
  headers: vi.fn(
    async () => new Headers({ "x-forwarded-for": `10.9.0.${(ipCounter += 1) % 255}` }),
  ),
}));

vi.mock("@/lib/features", () => ({ isFeatureEnabled: vi.fn(() => true) }));

// The route files import feature barrels that re-export admin Server Actions,
// which pull in next-auth; its ESM output defeats Vitest's resolver. These
// routes never call auth() themselves.
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

vi.mock("@/config/content/services", () => ({
  services: [{ slug: "test-service", name: "Test Service", description: "x", durationMinutes: 30 }],
}));

import { POST as bookingPOST } from "./booking/route";
import { POST as signupPOST } from "./customer-accounts/signup/route";
import { POST as leadsPOST } from "./leads/route";
import { POST as reviewsPOST } from "./reviews/route";

const JSON_HEADERS = { "content-type": "application/json" };

function post(handler: (r: Request) => Promise<Response>, url: string, body: unknown) {
  return handler(
    new Request(`http://localhost${url}`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(async () => {
  vi.mocked(isFeatureEnabled).mockReturnValue(true);
  await prisma.booking.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.review.deleteMany();
  await prisma.customer.deleteMany();
});

afterAll(async () => {
  await prisma.booking.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.review.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.$disconnect();
});

describe("POST /api/leads rejects unknown keys", () => {
  const valid = { name: "Jane", email: "jane@example.com", message: "Do you take new customers?" };

  it.each([
    ["status", { status: "HANDLED" }],
    ["id", { id: "attacker-chosen-id" }],
    ["createdAt", { createdAt: "1999-01-01T00:00:00.000Z" }],
    ["role", { role: "admin" }],
    ["isAdmin", { isAdmin: true }],
  ])("refuses an injected %s and writes nothing", async (_label, injected) => {
    const response = await post(leadsPOST, "/api/leads", { ...valid, ...injected });

    expect(response.status).toBe(400);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("still accepts a legitimate body", async () => {
    expect((await post(leadsPOST, "/api/leads", valid)).status).toBe(201);
    expect(await prisma.lead.count()).toBe(1);
  });

  /**
   * The escalation this closes. `Lead.status` is a real column — a lead filed
   * as already HANDLED drops out of the staff member's queue and nobody calls
   * that customer back.
   */
  it("never persists a lead as already handled", async () => {
    await post(leadsPOST, "/api/leads", { ...valid, status: "HANDLED" });

    expect(await prisma.lead.findFirst({ where: { status: "HANDLED" } })).toBeNull();
  });
});

describe("POST /api/reviews rejects unknown keys", () => {
  const valid = { authorName: "Jane", rating: 5, comment: "Lovely business." };

  it.each([
    ["status", { status: "APPROVED" }],
    ["id", { id: "attacker-chosen-id" }],
    ["createdAt", { createdAt: "1999-01-01T00:00:00.000Z" }],
    ["isAdmin", { isAdmin: true }],
  ])("refuses an injected %s and writes nothing", async (_label, injected) => {
    const response = await post(reviewsPOST, "/api/reviews", { ...valid, ...injected });

    expect(response.status).toBe(400);
    expect(await prisma.review.count()).toBe(0);
  });

  it("still accepts a legitimate body", async () => {
    expect((await post(reviewsPOST, "/api/reviews", valid)).status).toBe(201);
    expect(await prisma.review.count()).toBe(1);
  });

  /**
   * The sharpest one. Every public read filters `status = APPROVED`, so a
   * self-approved review is published on the business's homepage without any
   * moderation at all.
   */
  it("never persists a review as already approved", async () => {
    await post(reviewsPOST, "/api/reviews", { ...valid, status: "APPROVED" });

    expect(await prisma.review.findFirst({ where: { status: "APPROVED" } })).toBeNull();
  });
});

describe("POST /api/booking rejects unknown keys", () => {
  async function createSlot() {
    return prisma.availabilitySlot.create({
      data: {
        startsAt: new Date(Date.now() + 86_400_000),
        endsAt: new Date(Date.now() + 86_400_000 + 3_600_000),
        capacity: 1,
      },
    });
  }

  const base = {
    serviceSlug: "test-service",
    customerName: "Jane",
    customerEmail: "jane@example.com",
  };

  it.each([
    ["status", { status: "CONFIRMED" }],
    ["paid", { paid: true }],
    ["id", { id: "attacker-chosen-id" }],
    ["createdAt", { createdAt: "1999-01-01T00:00:00.000Z" }],
    ["stripeCheckoutSessionId", { stripeCheckoutSessionId: "cs_fake" }],
  ])("refuses an injected %s and writes nothing", async (_label, injected) => {
    const slot = await createSlot();
    const response = await post(bookingPOST, "/api/booking", {
      ...base,
      slotId: slot.id,
      ...injected,
    });

    expect(response.status).toBe(400);
    expect(await prisma.booking.count()).toBe(0);
  });

  it("still accepts a legitimate body", async () => {
    const slot = await createSlot();
    const response = await post(bookingPOST, "/api/booking", { ...base, slotId: slot.id });

    expect(response.status).toBe(201);
    expect(await prisma.booking.count()).toBe(1);
  });

  /**
   * A website booking is a REQUEST the staff member rings about. One that
   * arrives already CONFIRMED, or already paid, is an booking nobody
   * agreed to and a deposit nobody took.
   */
  it("never persists a booking as confirmed or paid", async () => {
    const slot = await createSlot();
    await post(bookingPOST, "/api/booking", {
      ...base,
      slotId: slot.id,
      status: "CONFIRMED",
      paid: true,
    });

    expect(await prisma.booking.findFirst({ where: { status: "CONFIRMED" } })).toBeNull();
    expect(await prisma.booking.findFirst({ where: { paid: true } })).toBeNull();
  });
});

describe("POST /api/customer-accounts/signup rejects unknown keys", () => {
  const valid = { name: "Jane", email: "jane@example.com", password: "correct horse battery" };

  it.each([
    [
      "passwordHash",
      { passwordHash: "$2b$10$attackerchosenhashvalueforthisrow000000000000000000" },
    ],
    ["id", { id: "attacker-chosen-id" }],
    ["role", { role: "admin" }],
    ["createdAt", { createdAt: "1999-01-01T00:00:00.000Z" }],
  ])("refuses an injected %s and writes nothing", async (_label, injected) => {
    const response = await post(signupPOST, "/api/customer-accounts/signup", {
      ...valid,
      ...injected,
    });

    expect(response.status).toBe(400);
    expect(await prisma.customer.count()).toBe(0);
  });

  it("still accepts a legitimate body", async () => {
    expect((await post(signupPOST, "/api/customer-accounts/signup", valid)).status).toBe(201);
    expect(await prisma.customer.count()).toBe(1);
  });

  /**
   * A chosen passwordHash would be an account whose password the attacker
   * already knows the hash of — and, if they picked a hash of a known string,
   * an account they can sign into.
   */
  it("never persists an attacker-supplied password hash", async () => {
    const injected = "$2b$10$attackerchosenhashvalueforthisrow000000000000000000";
    await post(signupPOST, "/api/customer-accounts/signup", { ...valid, passwordHash: injected });

    expect(await prisma.customer.findFirst({ where: { passwordHash: injected } })).toBeNull();
  });
});
