"use server";

import { requireAdmin } from "@/lib/auth-guards";
import { LeadNotFoundError, leadService } from "@/server/services/leadService";
import { leadIdSchema } from "../schema/lead-filters.schema";

export type LeadActionResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Returns a result rather than void — see the note in
 * features/reviews/api/moderate-review.ts for why, and for why there is no
 * revalidatePath here.
 */
export async function markLeadHandledAction(input: unknown): Promise<LeadActionResult> {
  await requireAdmin();

  const parsed = leadIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That message reference isn't valid." };
  }

  try {
    await leadService.markHandled(parsed.data.leadId);
  } catch (error) {
    if (error instanceof LeadNotFoundError) {
      return { ok: false, error: "That message no longer exists — this list is out of date." };
    }
    throw error;
  }

  return { ok: true, message: "Marked as handled." };
}
