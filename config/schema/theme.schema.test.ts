import { describe, expect, it } from "vitest";
import { themeConfigSchema } from "./theme.schema";

/**
 * The invariant documented at the top of theme.schema.ts, made executable.
 *
 * Every field added beyond the original colors/radius/fontSans set must carry
 * a `.default()`. A client repo's theme.config.ts is written once at
 * onboarding and then merged forward from upstream for the life of the site;
 * an un-defaulted field added here would hard-fail `themeConfigSchema.parse`
 * at module load in every repo that hasn't been updated — which is to say the
 * whole site would fail to boot, in a repo nobody was touching at the time.
 *
 * So this file's job is not to check that the schema works. It is to make that
 * failure impossible to introduce without a red test.
 */

/** The complete set of genuinely required input — nothing else. */
const MINIMAL = {
  colors: {
    background: "#FFFFFF",
    foreground: "#000000",
    primary: "#336699",
    primaryForeground: "#FFFFFF",
    secondary: "#EEEEEE",
    secondaryForeground: "#000000",
    accent: "#CC6600",
    accentForeground: "#000000",
  },
  radius: "0.5rem",
} as const;

describe("themeConfigSchema", () => {
  it("parses a config that sets only the required fields", () => {
    expect(() => themeConfigSchema.parse(MINIMAL)).not.toThrow();
  });

  it("materialises every optional colour, so a merged-forward config still renders", () => {
    const theme = themeConfigSchema.parse(MINIMAL);

    // If any of these is undefined, themeConfigToCssVars emits an empty custom
    // property and the corresponding utility silently resolves to nothing.
    for (const token of [
      "muted",
      "mutedForeground",
      "card",
      "cardForeground",
      "border",
      "input",
      "ring",
      "destructive",
      "destructiveForeground",
      "ink",
      "inkForeground",
      "inkMuted",
    ] as const) {
      expect(theme.colors[token], `colors.${token} has no default`).toBeTruthy();
    }
  });

  it("defaults the palette name, the font and the destructive pair", () => {
    const theme = themeConfigSchema.parse(MINIMAL);

    expect(theme.name).toBe("Brand");
    expect(theme.fontSans).toBe("geist");
    // The pre-theming shadcn values, so adopting this downstream changes
    // nothing visually until a client picks their own red.
    expect(theme.colors.destructive).toBe("oklch(0.577 0.245 27.325)");
    expect(theme.colors.destructiveForeground).toBe("oklch(0.985 0 0)");
  });

  it("still rejects a config missing a genuinely required colour", () => {
    const { background: _dropped, ...rest } = MINIMAL.colors;

    expect(() => themeConfigSchema.parse({ ...MINIMAL, colors: rest })).toThrow();
  });

  it("rejects an empty string, which would emit an invalid custom property", () => {
    expect(() =>
      themeConfigSchema.parse({ ...MINIMAL, colors: { ...MINIMAL.colors, primary: "" } }),
    ).toThrow();
  });

  it("accepts a font only from the closed enum layout.tsx actually imports", () => {
    // next/font/google needs a static import per face, so an arbitrary name
    // here would resolve to no font at all rather than to a fallback.
    expect(() =>
      themeConfigSchema.parse({ ...MINIMAL, fontSans: "plusJakartaSans" }),
    ).not.toThrow();
    expect(() => themeConfigSchema.parse({ ...MINIMAL, fontSans: "Comic Sans" })).toThrow();
  });
});
