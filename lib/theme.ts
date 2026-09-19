import type { CSSProperties } from "react";
import type { ThemeConfig } from "@/config/schema/theme.schema";

// CSSProperties has no index signature for custom properties (--foo); the
// cast is safe because every key below is a literal `--kebab-case` string.

/**
 * Every colour decision in the active theme, flattened into the CSS custom
 * properties that app/globals.css's `@theme inline` block reads.
 *
 * Components never touch these names — they use the Tailwind utilities those
 * theme entries generate (`bg-primary`, `text-muted-foreground`). That
 * indirection is the point: a new client edits theme.config.ts and nothing
 * else, and the theme picker at /dashboard/settings can swap the whole palette
 * by passing a different ThemeConfig through here.
 */
export function themeConfigToCssVars(theme: ThemeConfig): CSSProperties {
  const { colors } = theme;

  return {
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--primary": colors.primary,
    "--primary-foreground": colors.primaryForeground,
    "--secondary": colors.secondary,
    "--secondary-foreground": colors.secondaryForeground,
    "--accent": colors.accent,
    // Falls back to `accent` when a palette has not set it, so this is a no-op
    // for any theme that does not need the distinction.
    "--accent-on-ink": colors.accentOnInk ?? colors.accent,
    "--accent-foreground": colors.accentForeground,
    "--muted": colors.muted,
    "--muted-foreground": colors.mutedForeground,
    "--card": colors.card,
    "--card-foreground": colors.cardForeground,
    // shadcn primitives read --popover for floating surfaces; a client has no
    // reason to theme those separately from cards, so they track together.
    "--popover": colors.card,
    "--popover-foreground": colors.cardForeground,
    "--border": colors.border,
    "--input": colors.input,
    "--ring": colors.ring,
    "--destructive": colors.destructive,
    "--destructive-foreground": colors.destructiveForeground,
    "--ink": colors.ink,
    "--ink-foreground": colors.inkForeground,
    "--ink-muted": colors.inkMuted,

    "--radius": theme.radius,
    // Not a custom property — `color-scheme` is a real CSS property, and
    // setting it on <html> is what makes the browser paint its own widgets
    // (date pickers, selects, scrollbars) to match. See the schema comment.
    colorScheme: theme.colorScheme,
  } as CSSProperties;
}
