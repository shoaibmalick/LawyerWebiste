import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();

// Mocked rather than exercised for real: this is about the decision the guard
// makes given a session shape, and importing the real @/auth would drag
// next-auth into the module graph (see the resolver note in CLAUDE.md).
vi.mock("@/auth", () => ({ auth: authMock }));

const { requireAdmin } = await import("./auth-guards");

describe("requireAdmin", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("allows an admin session, and says who they are", async () => {
    // The identity is returned so actions can record authorship — a booking
    // call note has to say who made the call. Email rather than an id because
    // Auth.js's DefaultSession["user"] has none.
    authMock.mockResolvedValue({
      user: { email: "admin@example.com", name: "Reception", role: "admin" },
    });

    await expect(requireAdmin()).resolves.toEqual({
      email: "admin@example.com",
      name: "Reception",
    });
  });

  it("returns nulls rather than throwing when the session carries no name", async () => {
    // A note authored by someone whose profile has no name is still a valid
    // note; the UI falls back to the email.
    authMock.mockResolvedValue({ user: { email: "admin@example.com", role: "admin" } });

    await expect(requireAdmin()).resolves.toEqual({ email: "admin@example.com", name: null });
  });

  // The reason this guard exists. Admin and customer are separate credential
  // spaces on one NextAuth instance, so a customer holds a valid session and
  // would satisfy a bare `if (!session)` check.
  it("rejects a signed-in customer", async () => {
    authMock.mockResolvedValue({ user: { email: "customer@example.com", role: "customer" } });
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });

  it("rejects no session at all", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });

  it("rejects a session with no role", async () => {
    authMock.mockResolvedValue({ user: { email: "nobody@example.com" } });
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });

  it("rejects a session with no user", async () => {
    authMock.mockResolvedValue({});
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });
});
