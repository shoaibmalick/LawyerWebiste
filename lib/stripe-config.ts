import { openSecret } from "@/lib/secret-box";
import { settingsService } from "@/server/services/settingsService";

/**
 * Turns the stored payment settings into Stripe credentials.
 *
 * ## The second lib → server/services import in the repo
 *
 * Deliberate, and given its own file for the same reason lib/email-config.ts
 * has one: lib/stripe.ts stays free of a database dependency with exactly one
 * seam to mock. Everything about "what did the owner configure" lives here;
 * everything about "how do we charge" lives there.
 *
 * ## Where this differs from lib/email-config.ts, and it must not be "fixed"
 *
 * That file never throws and always resolves to the environment or to NONE,
 * because a missing mail transport is a soft failure — a booking should still
 * be taken when the confirmation email cannot go out.
 *
 * Payments are the opposite. A failed read here falls back to the environment,
 * exactly as email does; but when neither source yields a key this returns
 * null and the CALLER must refuse the payment rather than proceed without one.
 * Silently continuing would confirm an unpaid booking, which is the failure
 * lib/stripe.ts exists to prevent.
 */

/** What the settings page needs to know. Never includes a secret value. */
export type StripeConfigDiagnosis = {
  /** A secret key is configured, from either source. */
  hasSecretKey: boolean;
  /** A webhook signing secret is configured, from either source. */
  hasWebhookSecret: boolean;
  /** Not a secret; safe to show back. */
  publishableKey: string | null;
  /**
   * Where the effective secret key came from. "settings" means the business
   * connected its own account; "environment" means it is still running on the
   * values the agency deployed.
   */
  source: "settings" | "environment" | "none";
  /**
   * False when a stored secret exists but will not decrypt — in practice,
   * AUTH_SECRET was rotated. Payments still work when the environment holds a
   * key, but the owner is told their saved credentials are unreadable rather
   * than left wondering why their settings appear to be ignored.
   */
  secretsReadable: boolean;
  /**
   * Read from the key prefix, and shown in words on the settings page. A
   * business that believes it has been taking real payments for a week and has
   * not is the expensive version of this mistake.
   */
  mode: "test" | "live" | null;
};

function modeOf(secretKey: string | null): "test" | "live" | null {
  if (!secretKey) return null;
  if (secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")) return "live";
  if (secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_")) return "test";
  return null;
}

type Resolved = {
  secretKey: string | null;
  webhookSecret: string | null;
  publishableKey: string | null;
  source: "settings" | "environment" | "none";
  secretsReadable: boolean;
};

/**
 * @param storedPublishableKey carried through even when the secret key falls
 *   back to the environment. The publishable key is not a secret and is stored
 *   in the clear, so it has no reason to share the secret key's fate — an
 *   admin who saves only a publishable key must still see it, which is the bug
 *   the test named for it caught.
 */
function fromEnvironment(secretsReadable = true, storedPublishableKey?: string | null): Resolved {
  const secretKey = process.env.STRIPE_SECRET_KEY || null;
  return {
    secretKey,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
    publishableKey: storedPublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
    source: secretKey ? "environment" : "none",
    secretsReadable,
  };
}

async function resolve(): Promise<Resolved> {
  let settings;
  try {
    settings = await settingsService.getPaymentSettings();
  } catch (error) {
    // Mid-migration, mid-incident: fall back rather than taking the booking
    // path down along with the settings table.
    console.error("[stripe] could not read payment settings; using the environment", error);
    return fromEnvironment();
  }

  if (!settings.stripeSecretKey) {
    return fromEnvironment(true, settings.stripePublishableKey);
  }

  const secretKey = openSecret(settings.stripeSecretKey);
  if (!secretKey) {
    console.error(
      "[stripe] the saved secret key could not be decrypted — AUTH_SECRET may have been " +
        "rotated; falling back to the environment",
    );
    return fromEnvironment(false, settings.stripePublishableKey);
  }

  // A stored webhook secret that will not open is reported separately: whether
  // a secret is readable is a fact about that secret, not about whether this
  // particular call happens to need it. Same reasoning as email-config.ts.
  const storedWebhook = settings.stripeWebhookSecret;
  const webhookSecret = openSecret(storedWebhook);
  const webhookUnreadable = storedWebhook !== null && webhookSecret === null;
  if (webhookUnreadable) {
    console.error("[stripe] the saved webhook secret could not be decrypted");
  }

  return {
    secretKey,
    webhookSecret: webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET ?? null,
    publishableKey:
      settings.stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
    source: "settings",
    secretsReadable: !webhookUnreadable,
  };
}

/** The secret key, or null. Callers requiring payment must treat null as fatal. */
export async function resolveStripeSecretKey(): Promise<string | null> {
  return (await resolve()).secretKey;
}

/** The webhook signing secret, or null. The webhook answers 503 on null. */
export async function resolveStripeWebhookSecret(): Promise<string | null> {
  return (await resolve()).webhookSecret;
}

/** The full picture, for the settings page. Never includes a secret value. */
export async function diagnoseStripeConfig(): Promise<StripeConfigDiagnosis> {
  const resolved = await resolve();
  return {
    hasSecretKey: resolved.secretKey !== null,
    hasWebhookSecret: resolved.webhookSecret !== null,
    publishableKey: resolved.publishableKey,
    source: resolved.source,
    secretsReadable: resolved.secretsReadable,
    mode: modeOf(resolved.secretKey),
  };
}
