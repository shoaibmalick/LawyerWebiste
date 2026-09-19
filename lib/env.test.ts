import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The module validates at import time, so each case needs a fresh module
 * registry with the environment already set the way that case cares about.
 */
async function loadEnv(overrides: Record<string, string | undefined>, nodeEnv = "development") {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  for (const [key, value] of Object.entries(overrides)) {
    vi.stubEnv(key, value as string);
  }
  return import("./env");
}

describe("env", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts a development environment with only a database url", async () => {
    const { env, siteUrl } = await loadEnv({
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXT_PUBLIC_SITE_URL: undefined,
      AUTH_SECRET: undefined,
    });

    expect(env.DATABASE_URL).toContain("postgresql://");
    // The localhost default is correct in dev — it is only production where
    // guessing an origin is dangerous.
    expect(siteUrl).toBe("http://localhost:3000");
  });

  it("refuses to boot without a database url", async () => {
    await expect(loadEnv({ DATABASE_URL: "" })).rejects.toThrow(/DATABASE_URL/);
  });

  // The bug this module exists to prevent: unset in production, the old
  // fallback sent a paying customer to localhost after Stripe checkout.
  it("refuses to boot in production without a site url", async () => {
    await expect(
      loadEnv(
        {
          DATABASE_URL: "postgresql://localhost:5432/db",
          NEXT_PUBLIC_SITE_URL: undefined,
          AUTH_SECRET: "s",
        },
        "production",
      ),
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("refuses to boot in production without an auth secret", async () => {
    await expect(
      loadEnv(
        {
          DATABASE_URL: "postgresql://localhost:5432/db",
          NEXT_PUBLIC_SITE_URL: "https://example.com",
          AUTH_SECRET: "",
        },
        "production",
      ),
    ).rejects.toThrow(/AUTH_SECRET/);
  });

  it("accepts a complete production environment and strips a trailing slash", async () => {
    const { siteUrl } = await loadEnv(
      {
        DATABASE_URL: "postgresql://localhost:5432/db",
        NEXT_PUBLIC_SITE_URL: "https://example.com/",
        AUTH_SECRET: "a-real-secret",
      },
      "production",
    );

    // Trailing slashes would produce "https://example.com//booking/success".
    expect(siteUrl).toBe("https://example.com");
  });

  it("treats absent integrations as valid rather than as errors", async () => {
    const { env } = await loadEnv({
      DATABASE_URL: "postgresql://localhost:5432/db",
      STRIPE_SECRET_KEY: undefined,
      RESEND_API_KEY: undefined,
      ANTHROPIC_API_KEY: undefined,
    });

    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
    expect(env.RESEND_API_KEY).toBeUndefined();
  });
});
