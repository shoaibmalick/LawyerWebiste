"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { settingsService } from "@/server/services/settingsService";

export type StripeCredentialsActionResult =
  { ok: true; message: string } | { ok: false; error: string };

/**
 * Keys are validated by shape, not merely by presence.
 *
 * A pasted key with a stray space, or a publishable key pasted into the secret
 * field, both fail here rather than at the till — which is the only other
 * place they would fail, in front of a customer. `rk_` is Stripe's restricted
 * key prefix and is a legitimate thing to use here.
 *
 * `.optional()` on the secrets because blank means keep; `clear*` is the only
 * way to erase one.
 */
const stripeCredentialsSchema = z
  .object({
    stripeSecretKey: z
      .string()
      .trim()
      .regex(/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/, "That does not look like a Stripe secret key.")
      .optional()
      .or(z.literal("")),
    clearStripeSecretKey: z.boolean().optional(),
    stripeWebhookSecret: z
      .string()
      .trim()
      .regex(/^whsec_[A-Za-z0-9]+$/, "That does not look like a Stripe webhook signing secret.")
      .optional()
      .or(z.literal("")),
    clearStripeWebhookSecret: z.boolean().optional(),
    stripePublishableKey: z
      .string()
      .trim()
      .regex(/^pk_(test|live)_[A-Za-z0-9]+$/, "That does not look like a Stripe publishable key.")
      .optional()
      .or(z.literal("")),
  })
  .strict();

/**
 * Stores the Stripe credentials the business connects itself.
 *
 * Returns a result rather than void — see the note in
 * features/reviews/api/moderate-review.ts for why, and for why there is no
 * revalidatePath here.
 *
 * The secrets are sealed by settingsService before they reach a column, and
 * nothing in the return value echoes a key back: the settings page is told
 * that a key exists, never what it is.
 */
export async function saveStripeCredentialsAction(
  input: unknown,
): Promise<StripeCredentialsActionResult> {
  const admin = await requireAdmin();

  const parsed = stripeCredentialsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Those payment details are not valid.",
    };
  }

  await settingsService.saveStripeCredentials({
    ...parsed.data,
    updatedByEmail: admin.email,
  });

  return { ok: true, message: "Payment settings saved." };
}
