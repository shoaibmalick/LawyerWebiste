import { z } from "zod";

/**
 * Environment validated once, loudly, instead of four different fallbacks
 * quietly disagreeing.
 *
 * The fallback that motivated this: `process.env.NEXT_PUBLIC_SITE_URL ??
 * "http://localhost:3000"` appeared in four places, including the Stripe
 * `success_url`. Unset in production, a customer who paid a deposit was
 * redirected to localhost, the sitemap advertised localhost to crawlers, and
 * every social share pointed at localhost. All silent — the site looks fine
 * until someone actually pays.
 *
 * Strict in production, forgiving elsewhere: a dev or CI run must not need a
 * Stripe key to boot, but a production deploy missing its site URL should fail
 * at startup rather than at the checkout of a real customer.
 */
const isProduction = process.env.NODE_ENV === "production";

const schema = z.object({
  // Required everywhere — nothing works without a database.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Required in production only. In dev the localhost default is right; in
  // production there is no sane default and guessing one is how the Stripe
  // redirect bug happened.
  NEXT_PUBLIC_SITE_URL: isProduction
    ? z.string().url("NEXT_PUBLIC_SITE_URL must be a full URL in production")
    : z.string().url().default("http://localhost:3000"),

  // Auth.js derives session encryption from this. It has a dev fallback of its
  // own, so a missing value only bites in production — where it bites hard.
  AUTH_SECRET: isProduction
    ? z.string().min(1, "AUTH_SECRET is required in production")
    : z.string().optional(),

  // Optional integrations. Each already degrades on its own terms — email fails
  // soft, Stripe fails closed, the chatbot falls back to a phone number — so
  // absence is a valid configuration rather than an error.
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

function parseEnv() {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    // Thrown at import time so a misconfigured deploy fails on boot, where
    // someone is watching, rather than on a customer's booking.
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}

export const env = parseEnv();

/**
 * The site's public origin, without a trailing slash.
 *
 * Use this rather than reading NEXT_PUBLIC_SITE_URL directly — it is the value
 * that ends up in Stripe redirects, the sitemap and social tags, and those must
 * not be allowed to drift apart again.
 */
export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
