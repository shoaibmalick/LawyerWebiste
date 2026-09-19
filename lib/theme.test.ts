import { describe, expect, it } from "vitest";
import { themeConfigSchema } from "@/config/schema/theme.schema";
import { themeConfigToCssVars } from "./theme";

/**
 * themeConfigToCssVars is the single seam between config and every rendered
 * pixel: app/layout.tsx spreads its return value onto <html>, and every
 * Tailwind utility in the app resolves through those custom properties. A
 * dropped or misnamed key here doesn't throw — the utility just resolves to
 * nothing and the affected text turns invisible or unstyled.
 *
 * Built from a fixture rather than the real theme.config.ts: test files don't
 * diverge between client repos, so asserting on one client's palette would
 * break in the next (see CLAUDE.md Conventions).
 */
const theme = themeConfigSchema.parse({
  name: "Fixture",
  colors: {
    background: "#FFFFFF",
    foreground: "#111111",
    primary: "#336699",
    primaryForeground: "#FFFFFF",
    secondary: "#EEEEEE",
    secondaryForeground: "#111111",
    accent: "#CC6600",
    accentForeground: "#111111",
    card: "#FAFAFA",
    cardForeground: "#222222",
    destructive: "#AA0000",
    destructiveForeground: "#FFFFFF",
    ink: "#001122",
    inkForeground: "#EEEEFF",
    inkMuted: "#8899AA",
  },
  radius: "0.75rem",
});

const vars = themeConfigToCssVars(theme) as Record<string, string>;

describe("themeConfigToCssVars", () => {
  it("emits every colour the shadcn primitives read", () => {
    expect(vars["--background"]).toBe("#FFFFFF");
    expect(vars["--foreground"]).toBe("#111111");
    expect(vars["--primary"]).toBe("#336699");
    expect(vars["--secondary"]).toBe("#EEEEEE");
    expect(vars["--accent"]).toBe("#CC6600");
    expect(vars["--muted"]).toBeTruthy();
    expect(vars["--border"]).toBeTruthy();
    expect(vars["--ring"]).toBeTruthy();
  });

  it("emits the destructive pair", () => {
    // Added when the theme gained selectable palettes: error text is the one
    // colour that was previously unthemeable, and it is small text by
    // definition — the most likely token to fail contrast on a client palette.
    expect(vars["--destructive"]).toBe("#AA0000");
    expect(vars["--destructive-foreground"]).toBe("#FFFFFF");
  });

  it("emits the ink trio", () => {
    expect(vars["--ink"]).toBe("#001122");
    expect(vars["--ink-foreground"]).toBe("#EEEEFF");
    expect(vars["--ink-muted"]).toBe("#8899AA");
  });

  it("points --popover at the card colour", () => {
    // Floating shadcn surfaces track cards deliberately; a client has no
    // reason to theme them apart, and forgetting to set them is how a popover
    // ends up transparent.
    expect(vars["--popover"]).toBe(vars["--card"]);
    expect(vars["--popover-foreground"]).toBe(vars["--card-foreground"]);
  });

  it("emits the radius", () => {
    expect(vars["--radius"]).toBe("0.75rem");
  });

  it("emits no empty values", () => {
    // An empty custom property is the silent-failure case: valid CSS, no
    // visible colour, no error anywhere.
    const empty = Object.entries(vars).filter(([, value]) => !value);
    expect(empty).toEqual([]);
  });

  it("does not emit the font family", () => {
    // That is computed in layout.tsx from the SANS_FONT_VARS map, because a
    // font object's `.variable` is a generated class name rather than a var
    // name and cannot be used inside var().
    expect(vars["--font-sans"]).toBeUndefined();
  });
});
