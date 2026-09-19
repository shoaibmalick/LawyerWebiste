"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-guards";
import { siteSettingsService } from "@/server/services/siteSettingsService";

import { saveBusinessSchema } from "../schema/business.schema";
import type { SiteSettingsActionResult } from "./set-theme-preset";

/**
 * Save the business's contact details.
 *
 * A blank field is not an error and not an empty value — it clears the
 * override, so the configured value shows through again. That is the only way
 * back to config once something has been saved, and the form's placeholders say
 * so by showing what config holds.
 *
 * Revalidates the whole site rather than a page: the phone number is in the
 * header and footer, which are in the root layout, so there is no page that
 * does not carry it.
 */
export async function saveBusinessAction(input: unknown): Promise<SiteSettingsActionResult> {
  await requireAdmin();

  const parsed = saveBusinessSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Some of those details aren't valid.",
    };
  }

  await siteSettingsService.saveBusinessContact({
    businessPhone: parsed.data.phone ?? null,
    businessEmail: parsed.data.email ?? null,
    addressStreet: parsed.data.addressStreet ?? null,
    addressCity: parsed.data.addressCity ?? null,
    addressState: parsed.data.addressState ?? null,
    addressZip: parsed.data.addressZip ?? null,
    addressCountry: parsed.data.addressCountry ?? null,
    openingHours: parsed.data.hours ?? null,
  });

  // Layout-level: the header and footer carry the phone number on every route,
  // so nothing narrower than the whole tree is correct here.
  revalidatePath("/", "layout");

  return { ok: true, message: "Contact details saved." };
}
