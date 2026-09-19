import { connection } from "next/server";
import type { ThemeConfig } from "@/config/schema/theme.schema";
import { themePresets, type ThemePresetKey } from "@/config/theme.presets";
import { siteSettingsService } from "@/server/services/siteSettingsService";

/**
 * The palette the public site should render in.
 *
 * `connection()` first, and it is not optional. app/layout.tsx wraps every
 * route, and Next cannot tell that a plain Prisma call inside a Server
 * Component is dynamic the way it detects cookies() or headers() — so without
 * this the theme would be read once at build time and baked into every
 * prerendered page, frozen there until the next deploy. That is the exact trap
 * CLAUDE.md's "Dynamic rendering" note describes.
 *
 * The cost is that /credits, /login and the two booking result pages stop
 * being prerendered. That was weighed against caching the read: Next 16
 * supersedes `unstable_cache` with `use cache` (which needs `cacheComponents`
 * enabled app-wide), and changed `revalidateTag` to require a revalidation
 * profile, with the documentation now describing tags in terms of `use cache`
 * and `fetch` rather than `unstable_cache`. Rather than ship an invalidation
 * path whose semantics are that uncertain — where the failure mode is a
 * client changing their theme and nothing happening — this reads the row every
 * time. It is one indexed single-row query on a site whose homepage is already
 * force-dynamic.
 */
export async function getActiveTheme(): Promise<ThemeConfig> {
  await connection();

  let preset: ThemePresetKey;
  try {
    preset = await readStoredPreset();
  } catch (error) {
    // Load-bearing, not defensive padding: CI runs `next build` before it
    // applies migrations, so the first build after this ships renders against
    // a database with no SiteSettings table. The same applies to any
    // deployment whose DATABASE_URL isn't reachable at build time. Falling
    // back gives a correct-looking site instead of a failed build.
    console.error("[site-settings] could not read the theme; using the brand palette", error);
    return themePresets.BRAND;
  }

  // A preset removed from config while still stored in the database would
  // otherwise spread `undefined` onto <html> — every colour blank.
  return themePresets[preset] ?? themePresets.BRAND;
}

async function readStoredPreset(): Promise<ThemePresetKey> {
  return (await siteSettingsService.getSettings()).themePreset;
}

/** The stored choice, for the admin picker's current selection. */
export async function getActiveThemePreset(): Promise<ThemePresetKey> {
  return readStoredPreset();
}
