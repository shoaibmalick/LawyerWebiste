"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { settingsService } from "@/server/services/settingsService";

/**
 * Parsed at runtime, not merely typed.
 *
 * A TypeScript union is erased at compile time, and a Server Action's
 * arguments arrive as JSON from the network — so the signature
 * `timing: "UPFRONT" | "AFTER_SERVICE"` was a comment, not a check, and
 * anything at all could be written into the payment-timing setting. Admin-only
 * access kept it contained, which is why this is a Low; it is still the one
 * boundary in the codebase that was taking external input on trust.
 */
const paymentTimingSchema = z.enum(["UPFRONT", "AFTER_SERVICE"]);

export async function setPaymentTimingAction(timing: unknown): Promise<void> {
  await requireAdmin();

  const parsed = paymentTimingSchema.safeParse(timing);
  if (!parsed.success) {
    throw new Error("Invalid payment timing.");
  }

  await settingsService.setPaymentTiming(parsed.data);
}
