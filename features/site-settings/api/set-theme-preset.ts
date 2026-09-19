"use server";

import { themePresets } from "@/config/theme.presets";
import { requireAdmin } from "@/lib/auth-guards";
import { siteSettingsService } from "@/server/services/siteSettingsService";
import { setThemeSchema } from "../schema/settings.schema";

export type SiteSettingsActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function setThemePresetAction(input: unknown): Promise<SiteSettingsActionResult> {
  await requireAdmin();

  const parsed = setThemeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That isn't one of the available themes." };
  }

  await siteSettingsService.setThemePreset(parsed.data.preset);

  // No revalidation: getActiveTheme calls connection(), so every route under
  // the root layout renders per-request and reads the new value on the next
  // load. Calling revalidatePath here would imply a cache that doesn't exist.
  return { ok: true, message: `Theme set to ${themePresets[parsed.data.preset].name}.` };
}
