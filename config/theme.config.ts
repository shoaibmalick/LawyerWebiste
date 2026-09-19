import { themeConfigSchema } from "./schema/theme.schema";

/**
 * Harbourline Law Group LLP.
 *
 * A cross-border law firm reads as institutional before it reads as anything
 * else, so the palette is built on three bands rather than a colour story:
 * paper (warm off-white), linen (one step down, for alternating sections), and
 * ink (deep navy, for full-bleed anchor bands). Slate navy carries authority;
 * a muted brass accent supplies the one warm note, which is what keeps the
 * whole thing from looking like a bank.
 *
 * Paper is #FAF9F7 rather than pure white on purpose. A legal site is long-form
 * reading, and a warm ground is measurably easier on the eye across a 2,000-word
 * practice-area page than #FFFFFF.
 *
 * Measured contrast (WCAG 2.1 sRGB), every pair the site actually renders:
 *   body on paper 13.89 · linen 12.30 · ink 14.35
 *   eyebrow (primary) on paper 8.24 · linen 7.29
 *   muted body on paper 6.12 · linen 5.42 · inkMuted on ink 7.20
 *   button label on primary 8.24 · accent label on accent 5.13
 *   accentOnInk on the audience panels 4.70 · on the raw ink band 5.33
 *   destructive on paper 7.19 · focus ring on paper 5.07
 *
 * `accent` (#B07D2A) is 4.51 on ink — fine as an eyebrow there — but only 3.43
 * on paper, so on a light ground it is **decoration and large display only**,
 * never body copy. That is not a defect to fix: one accent cannot clear 4.5
 * against both a near-white and a near-black field, because the first needs
 * relative luminance <= 0.167 and the second needs >= 0.241. The kit's own
 * HARBOUR preset resolves the same conflict the same way (its teal is 2.35 on
 * paper). Use `primary` when you need coloured text on light.
 */
export const themeConfig = themeConfigSchema.parse({
  name: "Harbourline",
  colors: {
    background: "#FAF9F7", // paper
    foreground: "#152A40",
    primary: "#1D4E7A", // slate navy — eyebrows, links, primary buttons
    primaryForeground: "#FAF9F7",
    secondary: "#EFEBE4", // linen — one step below paper, for alternating bands
    secondaryForeground: "#152A40",
    accent: "#B07D2A", // brass — see the note above before using as text
    // A lifted brass for accent text on ink. 4.70:1 on the audience panels
    // (ink + 5% lift) and 5.33:1 on the raw band; the darker `accent` above
    // measures 3.98:1 on those panels and fails. See theme.schema.ts.
    accentOnInk: "#BE8A33",
    accentForeground: "#1A1206",

    muted: "#E6E1D8",
    mutedForeground: "#4E6076",
    card: "#FFFFFF",
    cardForeground: "#152A40",
    border: "#DAD3C8",
    input: "#DAD3C8",
    // Brighter than `primary`: a focus halo is non-text, where the bar is 3:1,
    // and the lighter blue reads better as a ring than the body-text navy.
    ring: "#2A6FA8",
    destructive: "#A32017",
    destructiveForeground: "#FAF9F7",

    ink: "#0E2136", // the deepest band — hero, audience split, closing CTA
    inkForeground: "#EDF1F5",
    inkMuted: "#9AAFC2",
  },
  radius: "0.375rem", // tighter than the kit's 0.75rem; softness reads consumer, not counsel
  colorScheme: "light",
  fontSans: "plusJakartaSans",
});
