import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";

// A unique simulated IP per call, so unrelated cases never collide in the
// shared in-memory rate limiter. It has to be *IP-shaped*: lib/client-ip.ts
// now ignores header values that are not addresses, because accepting
// arbitrary client text as a limiter key is what let an attacker mint a
// fresh quota per request.
let ipCounter = 0;
vi.mock("next/headers", () => ({
  headers: vi.fn(
    async () => new Headers({ "x-forwarded-for": `10.0.1.${(ipCounter += 1) % 255}` }),
  ),
}));

vi.mock("@/lib/features", () => ({
  isFeatureEnabled: vi.fn(() => true),
}));

// submitBooking validates the requested service against config/content, and
// checks it fits the slot. Test files are shared across client repos, so this
// mocks a fixture rather than asserting against whichever services a
// particular client happens to sell (see the note in CLAUDE.md).
vi.mock("@/config/content/services", () => ({
  services: [
    { slug: "test-service", name: "Test Service", description: "x", durationMinutes: 30 },
    { slug: "too-long", name: "Too Long", description: "x", durationMinutes: 240 },
  ],
}));

// The route imports from the feature's barrel (features/booking), which also
// exports cancelBookingAction (unused here) — that pulls in @/auth ->
// next-auth, whose ESM output Vitest's resolver chokes on ("Cannot find
// module .../next/server"). Mock it out; this route doesn't call auth().
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

import { POST } from "./route";

async function createSlot() {
  return prisma.availabilitySlot.create({
    data: {
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 25 * 60 * 60 * 1000),
      capacity: 1,
    },
  });
}

describe("POST /api/booking", () => {
  beforeEach(async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true);
    await prisma.booking.deleteMany();
    await prisma.availabilitySlot.deleteMany();
  });

  afterAll(async () => {
    await prisma.booking.deleteMany();
    await prisma.availabilitySlot.deleteMany();
    await prisma.$disconnect();
  });

  it("returns 404 when the booking feature is disabled", async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(false);
    const response = await POST(
      new Request("http://localhost/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slotId: "x",
          serviceSlug: "test-service",
          customerName: "A",
          customerEmail: "a@example.com",
        }),
      }),
    );
    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid input", async () => {
    const response = await POST(
      new Request("http://localhost/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slotId: "", customerName: "", customerEmail: "nope" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for a nonexistent slot", async () => {
    const response = await POST(
      new Request("http://localhost/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slotId: "does-not-exist",
          serviceSlug: "test-service",
          customerName: "Jane",
          customerEmail: "jane@example.com",
        }),
      }),
    );
    expect(response.status).toBe(404);
  });

  it("creates a booking and returns 201 for a valid available slot", async () => {
    const slot = await createSlot();
    const response = await POST(
      new Request("http://localhost/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          serviceSlug: "test-service",
          customerName: "Jane",
          customerEmail: "jane@example.com",
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    // A website booking is a request the practice rings about, not an
    // appointment it has agreed to.
    expect(body.booking.status).toBe("REQUESTED");
  });

  /**
   * G9.4 — the cap has to reach the caller as something actionable.
   *
   * A service error with no route branch is a 500, which tells a patient
   * nothing and puts a fake fault in the error rate. 409 with a message that
   * says to ring the practice is the whole point of the control.
   */
  it("returns 409, not 500, once the patient is at the booking cap", async () => {
    const emails = { customerEmail: "capped@example.com", customerName: "Jane" };

    for (let i = 1; i <= 3; i += 1) {
      const slot = await prisma.availabilitySlot.create({
        data: {
          startsAt: new Date(Date.now() + i * 86_400_000),
          endsAt: new Date(Date.now() + i * 86_400_000 + 3_600_000),
          capacity: 1,
        },
      });
      const ok = await POST(
        new Request("http://localhost/api/booking", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slotId: slot.id, serviceSlug: "test-service", ...emails }),
        }),
      );
      expect(ok.status).toBe(201);
    }

    const extra = await createSlot();
    const response = await POST(
      new Request("http://localhost/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slotId: extra.id, serviceSlug: "test-service", ...emails }),
      }),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    // Actionable, and it must not echo the address back.
    expect(body.error).toMatch(/call us/i);
    expect(body.error).not.toContain("capped@example.com");
    expect(await prisma.booking.count({ where: { customerEmail: "capped@example.com" } })).toBe(3);
  });

  it("returns 409 when the slot is already full", async () => {
    const slot = await createSlot();
    await prisma.booking.create({
      data: {
        slotId: slot.id,
        serviceSlug: "checkup-cleaning",
        customerName: "First",
        customerEmail: "first@example.com",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          serviceSlug: "test-service",
          customerName: "Second",
          customerEmail: "second@example.com",
        }),
      }),
    );
    expect(response.status).toBe(409);
  });
});
