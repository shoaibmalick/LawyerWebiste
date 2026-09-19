import { themeConfigSchema, type ThemeConfig } from "./schema/theme.schema";
import { themeConfig } from "./theme.config";

/**
 * The palettes a client can choose between at /dashboard/settings.
 *
 * Only colour varies. Each preset is built by spreading the client's own
 * theme.config.ts and replacing `colors`, so the typeface, type scale, radius,
 * spacing and motion are the brand's in all three — a practice that picks a
 * dark palette should still look like the same practice, and a client who
 * later changes their display font gets it everywhere rather than in one theme
 * out of three.
 *
 * `BRAND` is aliased, not copied. config/theme.config.ts remains the single
 * hand-edited brand file the onboarding checklist points at.
 *
 * The keys are deliberately generic: this file merges into the template and on
 * to the next client, where "BRAND" still means "this client's palette". They
 * must stay in step with the `ThemePreset` enum in prisma/schema.prisma — the
 * test asserts that, since a mismatch would only surface as a runtime lookup
 * miss on whichever preset was renamed.
 */
export const THEME_PRESET_KEYS = ["BRAND", "MIDNIGHT", "HARBOUR"] as const;
export type ThemePresetKey = (typeof THEME_PRESET_KEYS)[number];

function palette(
  name: string,
  colors: ThemeConfig["colors"],
  colorScheme: ThemeConfig["colorScheme"] = "dark",
): ThemeConfig {
  // colorScheme travels with the palette rather than with the brand, because
  // it describes the palette. Midnight is dark and Harbour is light, and a
  // client switching between them must not be left with a date picker that
  // renders white on white.
  return themeConfigSchema.parse({ ...themeConfig, name, colors, colorScheme });
}

/*
 * Midnight — the practice after dark, not a generic grey dark mode.
 *
 * The paper/linen/ink field system inverts here, and that is the whole design
 * problem. On a light palette linen is *darker* than paper (L* 93.0 vs 97.4);
 * below a dark base field the only direction left is deeper, and ink needs
 * that room, so linen goes *lighter* instead (17.3 vs 11.0). The step is
 * actually wider than the light theme's — 6.4 L* against 4.4 — so the
 * alternation reads more clearly, not less.
 *
 * What genuinely weakens: paper->ink is 1.18:1 here against 12.48:1 on
 * Evergreen. The ink bands become a deep well rather than a dramatic
 * inversion. Apricot eyebrows (9.76:1 on ink) and the lifted ink-foreground
 * carry the distinction instead.
 *
 * Measured (WCAG 2.1 sRGB) — every pair Section actually renders:
 *   body on paper 14.37 · linen 12.20 · ink 17.55
 *   deck on paper  8.22 · linen  6.98 · ink  8.71
 *   eyebrow paper  7.75 · linen  6.58 · ink (accent) 9.76
 *   button label 7.79 · error on paper 7.32 · focus ring 7.75
 */
const MIDNIGHT: ThemeConfig["colors"] = {
  background: "#12201E", // spruce night — the base field
  foreground: "#E8EFEB",
  primary: "#6FBFA8", // rosemary lifted for a dark ground
  primaryForeground: "#08211C",
  secondary: "#1C2E2A", // linen: *lighter* than paper here, see above
  secondaryForeground: "#E8EFEB",
  accent: "#E9A971", // apricot, warmed slightly
  accentForeground: "#241206",

  muted: "#243430",
  mutedForeground: "#A6BAB2",
  card: "#1A2827",
  cardForeground: "#E8EFEB",
  border: "#2E403B",
  input: "#2E403B",
  ring: "#6FBFA8",
  destructive: "#F09285",
  destructiveForeground: "#2A0906",

  ink: "#050C0B", // the deepest step, still the anchor
  inkForeground: "#EDF3EF",
  inkMuted: "#9CB1A8",
};

/*
 * Harbour — the clinical blue a dental practice is expected to wear.
 *
 * Same three-band shape as Evergreen (paper 98.1 -> linen 94.3 -> ink 16.0),
 * so the homepage's rhythm transfers unchanged.
 *
 * `primary` is #16607F rather than the more obvious #1B6B8F: that lighter blue
 * measures 4.34:1 on paper and 3.95:1 on linen, both under AA, and `primary`
 * is the section eyebrow and the TeamGrid role line — small text, in the two
 * places it is read most. #1B6B8F survives as `ring`, where the bar is 3:1 for
 * non-text and the brighter blue reads better as a focus halo.
 *
 * Measured:
 *   body on paper 14.12 · linen 12.84 · ink 13.07
 *   deck on paper  6.25 · linen  5.68 · ink  6.79
 *   eyebrow paper  6.65 · linen  6.04 · ink (accent) 6.01
 *   button label 6.65 · error on paper 7.22 · focus ring 5.65
 */
const HARBOUR: ThemeConfig["colors"] = {
  background: "#F7FAFC",
  foreground: "#0F2A3D",
  primary: "#16607F", // NOT #1B6B8F — that fails AA as eyebrow text
  primaryForeground: "#F7FAFC",
  secondary: "#E8F0F5",
  secondaryForeground: "#0F2A3D",
  accent: "#4FB3BF", // teal; decoration and large display only (2.35:1 on paper)
  accentForeground: "#06202E",

  muted: "#DDE8F0",
  mutedForeground: "#4A6072",
  card: "#FFFFFF",
  cardForeground: "#0F2A3D",
  border: "#CFDDE7",
  input: "#CFDDE7",
  ring: "#1B6B8F",
  destructive: "#A32017",
  destructiveForeground: "#F7FAFC",

  ink: "#0F2A3D",
  inkForeground: "#EAF2F7",
  inkMuted: "#9BB3C4",
};

export const themePresets: Record<ThemePresetKey, ThemeConfig> = {
  BRAND: themeConfig,
  MIDNIGHT: palette("Midnight", MIDNIGHT),
  HARBOUR: palette("Harbour", HARBOUR, "light"),
};

/** One preset, reduced to what the picker needs to render a labelled row. */
export type ThemePresetSummary = {
  key: ThemePresetKey;
  name: string;
  /** paper, linen, ink, primary, accent — enough to recognise the palette. */
  swatch: [string, string, string, string, string];
};

/**
 * Serialisable summaries for the admin picker.
 *
 * The picker is a client component, so it must not import `themePresets` — that
 * would pull all three full configs, every type step and every spacing token,
 * into the browser bundle to render fifteen coloured squares.
 */
export function themePresetSummaries(): ThemePresetSummary[] {
  return THEME_PRESET_KEYS.map((key) => {
    const { name, colors } = themePresets[key];
    return {
      key,
      name,
      swatch: [colors.background, colors.secondary, colors.ink, colors.primary, colors.accent],
    };
  });
}
