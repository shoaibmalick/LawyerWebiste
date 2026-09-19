"use server";

import { requireAdmin } from "@/lib/auth-guards";
import { siteSettingsService } from "@/server/services/siteSettingsService";
import { followUpWindowSchema } from "../schema/booking-actions.schema";
import type { BookingActionResult } from "./confirm-booking";

/**
 * How many days ahead the follow-up view looks.
 *
 * Guarded despite being a read. Every export of a `"use server"` module is a
 * POST-able RPC endpoint, not merely a function the dashboard happens to call
 * — so an unguarded export here is a public API whether it looks like one or
 * not. What leaks is one small integer, which is why this is a Low and not a
 * High; the reason to fix it anyway is that "reads don't need a guard" is the
 * habit that eventually ships an unguarded read of something that matters.
 */
export async function getFollowUpWindow(): Promise<number> {
  await requireAdmin();

  return (await siteSettingsService.getSettings()).followUpDays;
}

export async function setFollowUpWindowAction(input: unknown): Promise<BookingActionResult> {
  await requireAdmin();

  const parsed = followUpWindowSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Pick a number of days between 1 and 60." };
  }

  await siteSettingsService.setFollowUpDays(parsed.data.days);

  return {
    ok: true,
    message: `Follow-up now looks ${parsed.data.days} day${parsed.data.days === 1 ? "" : "s"} ahead.`,
  };
}
