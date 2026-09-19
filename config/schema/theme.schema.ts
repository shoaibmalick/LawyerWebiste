import { z } from "zod";

// Every field added beyond the original colors/radius/fontSans set carries a
// `.default()`. A client repo's theme.config.ts is written once at onboarding
// and then merged forward from upstream for the life of the site — an
// un-defaulted field here would hard-fail `themeConfigSchema.parse` at module
// load in every repo that hasn't been updated yet, which is to say the whole
// site would fail to boot in a repo nobody was touching at the time. The
// defaults reproduce the previous neutral look, so merging this down is a
// visual no-op until a client opts in.

export const themeConfigSchema = z.object({
  /**
   * Human label for this palette, shown beside its swatches in the theme
   * picker at /dashboard/settings. Lives here rather than in the picker so a
   * client's own palette name is content, not something hardcoded into a
   * shared component.
   */
  name: z.string().min(1).default("Brand"),

  colors: z.object({
    background: z.string().min(1),
    foreground: z.string().min(1),
    primary: z.string().min(1),
    primaryForeground: z.string().min(1),
    secondary: z.string().min(1),
    secondaryForeground: z.string().min(1),
    accent: z.string().min(1),
    accentForeground: z.string().min(1),

    muted: z.string().min(1).default("oklch(0.97 0 0)"),
    mutedForeground: z.string().min(1).default("oklch(0.556 0 0)"),
    card: z.string().min(1).default("oklch(1 0 0)"),
    cardForeground: z.string().min(1).default("oklch(0.145 0 0)"),
    border: z.string().min(1).default("oklch(0.922 0 0)"),
    input: z.string().min(1).default("oklch(0.922 0 0)"),
    ring: z.string().min(1).default("oklch(0.708 0 0)"),

    // Error text and destructive controls. This previously existed only in
    // globals.css's :root, inherited from shadcn and never themed — making it
    // the one colour on the page a client could not correct, on a token that
    // is small text by definition and therefore the most likely to fail
    // contrast against a client's own background.
    destructive: z.string().min(1).default("oklch(0.577 0.245 27.325)"),
    destructiveForeground: z.string().min(1).default("oklch(0.985 0 0)"),

    // A full-bleed dark field, for clients whose design uses dark bands as
    // page anchors. Deliberately separate from `foreground` so a client can
    // have dark body text without committing to that same colour as a large
    // background wash.
    /**
     * Accent text on an ink ground.
     *
     * Separate from `accent` because the two have opposite requirements and one
     * value cannot serve both: `accent` has to work as decoration on paper,
     * where darker is better, and as readable text on ink, where lighter is.
     *
     * This was found by an axe-core run, not by inspection. The Harbourline
     * accent measures 4.51:1 on the raw ink band — a pass — but the audience
     * panels sit on `bg-ink-foreground/5`, and that 5% lift drops the same pair
     * to 3.98:1. Measuring against the band rather than against the surface
     * actually rendered is an easy mistake to make twice, so the token exists to
     * make the distinction explicit.
     *
     * Defaults to the same value as `accent`, so a palette that has not set it
     * behaves exactly as it did. A client switching presets should re-measure:
     * theme.presets.ts records per-palette ratios for this reason.
     */
    accentOnInk: z.string().min(1).optional(),

    ink: z.string().min(1).default("oklch(0.205 0 0)"),
    inkForeground: z.string().min(1).default("oklch(0.985 0 0)"),
    inkMuted: z.string().min(1).default("oklch(0.708 0 0)"),
  }),
  radius: z.string().min(1),
  /**
   * Which way the browser should render the controls it draws itself.
   *
   * Not decoration. Native widgets — a date input's calendar button and its
   * popup, select dropdowns, scrollbars — are painted by the browser from
   * `color-scheme`, and no stylesheet reaches inside them. A dark palette left
   * at the default gets a dark calendar icon on a dark field, invisible, and a
   * blazing white calendar when it opens.
   *
   * A token rather than a value inferred from the background, because a client
   * can switch preset at /dashboard/settings: it has to travel with the
   * palette, not with the brand.
   */
  colorScheme: z.enum(["light", "dark"]).default("light"),
  // next/font/google requires a static import per font (see app/layout.tsx),
  // so this is a closed enum of the fonts actually imported there, not an
  // arbitrary Google Font name.
  fontSans: z.enum(["geist", "plusJakartaSans"]).default("geist"),
});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;
