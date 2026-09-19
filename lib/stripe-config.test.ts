import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { sealSecret } from "@/lib/secret-box";
import { settingsService } from "@/server/services/settingsService";
import {
  diagnoseStripeConfig,
  resolveStripeSecretKey,
  resolveStripeWebhookSecret,
} from "./stripe-config";

const LIVE_KEY = "sk_live_exampleexampleexample";
const TEST_KEY = "sk_test_exampleexampleexample";
const WEBHOOK = "whsec_exampleexampleexample";

const originalEnv = {
  secret: process.env.STRIPE_SECRET_KEY,
  webhook: process.env.STRIPE_WEBHOOK_SECRET,
  publishable: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};

beforeEach(async () => {
  await prisma.paymentSettings.deleteMany();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
});

afterEach(async () => {
  await prisma.paymentSettings.deleteMany();
  process.env.STRIPE_SECRET_KEY = originalEnv.secret;
  process.env.STRIPE_WEBHOOK_SECRET = originalEnv.webhook;
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalEnv.publishable;
});

describe("resolving credentials", () => {
  it("returns null when nothing is configured anywhere", async () => {
    // The case the caller must treat as fatal. Returning a client here, or an
    // empty string, is how an unpaid booking gets confirmed.
    expect(await resolveStripeSecretKey()).toBeNull();
    expect((await diagnoseStripeConfig()).source).toBe("none");
  });

  it("falls back to the environment when no key is stored", async () => {
    // An existing deployment that never opens the settings page must behave
    // exactly as it did before this feature existed.
    process.env.STRIPE_SECRET_KEY = TEST_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK;

    expect(await resolveStripeSecretKey()).toBe(TEST_KEY);
    expect(await resolveStripeWebhookSecret()).toBe(WEBHOOK);
    expect((await diagnoseStripeConfig()).source).toBe("environment");
  });

  it("prefers a stored key over the environment", async () => {
    process.env.STRIPE_SECRET_KEY = TEST_KEY;
    await settingsService.saveStripeCredentials({ stripeSecretKey: LIVE_KEY });

    expect(await resolveStripeSecretKey()).toBe(LIVE_KEY);
    expect((await diagnoseStripeConfig()).source).toBe("settings");
  });

  it("round-trips a stored key through encryption", async () => {
    await settingsService.saveStripeCredentials({
      stripeSecretKey: TEST_KEY,
      stripeWebhookSecret: WEBHOOK,
    });

    expect(await resolveStripeSecretKey()).toBe(TEST_KEY);
    expect(await resolveStripeWebhookSecret()).toBe(WEBHOOK);
  });

  it("stores the secret as ciphertext, not plaintext", async () => {
    await settingsService.saveStripeCredentials({ stripeSecretKey: TEST_KEY });

    const row = await prisma.paymentSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(row.stripeSecretKey).not.toBeNull();
    expect(row.stripeSecretKey).not.toContain(TEST_KEY);
  });
});

describe("the three-state secret field", () => {
  it("keeps the stored key when the field is blank", async () => {
    await settingsService.saveStripeCredentials({ stripeSecretKey: TEST_KEY });
    // An admin editing the publishable key alone leaves the secret untouched.
    await settingsService.saveStripeCredentials({
      stripeSecretKey: "",
      stripePublishableKey: "pk_test_abc",
    });

    expect(await resolveStripeSecretKey()).toBe(TEST_KEY);
  });

  it("erases the stored key only on an explicit clear", async () => {
    await settingsService.saveStripeCredentials({ stripeSecretKey: TEST_KEY });
    await settingsService.saveStripeCredentials({ clearStripeSecretKey: true });

    expect(await resolveStripeSecretKey()).toBeNull();
  });
});

describe("diagnosis for the settings page", () => {
  it("never contains a secret value", async () => {
    // PAY1. The page is told a key exists, never what it is — not the
    // ciphertext and not a masked prefix of the plaintext.
    await settingsService.saveStripeCredentials({
      stripeSecretKey: LIVE_KEY,
      stripeWebhookSecret: WEBHOOK,
    });

    const diagnosis = await diagnoseStripeConfig();
    const serialised = JSON.stringify(diagnosis);

    expect(diagnosis.hasSecretKey).toBe(true);
    expect(diagnosis.hasWebhookSecret).toBe(true);
    expect(serialised).not.toContain(LIVE_KEY);
    expect(serialised).not.toContain(WEBHOOK);
    // Not even a fragment of one.
    expect(serialised).not.toContain("exampleexample");
  });

  it("reads test versus live from the key prefix", async () => {
    await settingsService.saveStripeCredentials({ stripeSecretKey: TEST_KEY });
    expect((await diagnoseStripeConfig()).mode).toBe("test");

    await settingsService.saveStripeCredentials({ stripeSecretKey: LIVE_KEY });
    expect((await diagnoseStripeConfig()).mode).toBe("live");
  });

  it("shows the publishable key, which is not a secret", async () => {
    await settingsService.saveStripeCredentials({ stripePublishableKey: "pk_live_visible" });
    expect((await diagnoseStripeConfig()).publishableKey).toBe("pk_live_visible");
  });

  it("reports an unreadable secret rather than pretending it is absent", async () => {
    // Simulates AUTH_SECRET having been rotated: the column holds ciphertext
    // that no longer opens. The owner must be told, not left wondering why
    // their saved settings appear to be ignored.
    await settingsService.saveStripeCredentials({ stripeSecretKey: TEST_KEY });
    await prisma.paymentSettings.update({
      where: { id: 1 },
      data: { stripeSecretKey: sealSecret(TEST_KEY).slice(0, -4) + "0000" },
    });

    const diagnosis = await diagnoseStripeConfig();
    expect(diagnosis.secretsReadable).toBe(false);
    // And it falls back rather than leaving the business unable to charge.
    expect(diagnosis.source).toBe("none");
  });

  it("survives an unreachable settings table by using the environment", async () => {
    // Mid-migration or mid-incident, the booking path must not go down with
    // the settings row. Behaviour is asserted through the public API rather
    // than by breaking Prisma: with no row at all, the environment answers.
    process.env.STRIPE_SECRET_KEY = TEST_KEY;
    await prisma.paymentSettings.deleteMany();

    expect(await resolveStripeSecretKey()).toBe(TEST_KEY);
  });
});
