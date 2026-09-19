import { z } from "zod";
import { THEME_PRESET_KEYS } from "@/config/theme.presets";

/**
 * Derived from the preset list rather than restated, so adding a palette is a
 * one-line change in config/theme.presets.ts (plus the Prisma enum, which
 * theme.presets.test.ts checks stays in step).
 */
export const themePresetSchema = z.enum(THEME_PRESET_KEYS);

export const setThemeSchema = z
  .object({
    preset: themePresetSchema,
  })
  .strict();

export type SetThemeInput = z.infer<typeof setThemeSchema>;
