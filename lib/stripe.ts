import Stripe from "stripe";

/**
 * The Stripe client, built from whatever credentials are configured.
 *
 * ## Why this is a function and not a constant any more
 *
 * It used to be `export const stripe = process.env.STRIPE_SECRET_KEY ? … : null`
 * — resolved once, at module load, from the environment. That made connecting
 * a Stripe account an agency job: an env var and a redeploy. The business now
 * connects its own account from /dashboard/settings, which means the key comes
 * out of the database and cannot be read synchronously at import time.
 *
 * ## The rule callers must keep
 *
 * Callers must NOT silently no-op when this returns null. Skipping payment
 * collection while still confirming a booking is a real bug, not a harmless
 * missing side effect. Treat null as a hard configuration error wherever a
 * deposit is actually required — throw StripeNotConfiguredError and answer 503.
 *
 * This is the one place the payments path deliberately differs from email.
 * lib/email-config.ts never throws and always falls back, because an
 * unconfigured mailbox is a soft failure. An unconfigured till is not.
 */
export async function getStripe(): Promise<Stripe | null> {
  // Imported lazily so this module carries no database dependency at import
  // time — the same reason lib/email.ts keeps config resolution in a separate
  // file, and it keeps `next build` from touching Postgres.
  const { resolveStripeSecretKey } = await import("@/lib/stripe-config");
  const secretKey = await resolveStripeSecretKey();
  return secretKey ? new Stripe(secretKey) : null;
}

/**
 * The Stripe client, or a thrown error. For call sites where a payment is
 * genuinely required and continuing without one would be the bug above.
 */
export async function requireStripe(): Promise<Stripe> {
  const stripe = await getStripe();
  if (!stripe) throw new StripeNotConfiguredError();
  return stripe;
}

export class StripeNotConfiguredError extends Error {
  constructor() {
    super(
      "Payments are enabled but no Stripe secret key is configured — " +
        "set one at /dashboard/settings or in STRIPE_SECRET_KEY.",
    );
    this.name = "StripeNotConfiguredError";
  }
}
