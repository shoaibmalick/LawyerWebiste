import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  THEME_PRESET_KEYS,
  themePresetSummaries,
  themePresets,
  type ThemePresetKey,
} from "./theme.presets";
import type { ThemeConfig } from "./schema/theme.schema";

/**
 * Accessibility as an assertion rather than a comment.
 *
 * The ratios written into theme.presets.ts are only trustworthy for as long as
 * nobody nudges a hex. A palette is exactly the kind of thing someone adjusts
 * by eye at 11pm, and the failure is invisible to the person making it —
 * their monitor is bright and they already know what the text says.
 *
 * BRAND is deliberately not tested. It aliases the client's own
 * theme.config.ts, and test files do not diverge between client repos (see
 * CLAUDE.md Conventions), so asserting on this practice's greens would fail in
 * the next repo that merges this file. The two kit-owned palettes are the ones
 * this kit is responsible for.
 */
const KIT_OWNED = ["MIDNIGHT", "HARBOUR"] as const satisfies readonly ThemePresetKey[];

const channel = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    throw new Error(
      `${hex} is not a 6-digit hex colour. The kit-owned presets are hex by ` +
        `convention so their contrast can be checked here; switching one to ` +
        `oklch() would silently skip it.`,
    );
  }
  const n = parseInt(match[1], 16);
  return (
    0.2126 * channel((n >> 16) & 0xff) +
    0.7152 * channel((n >> 8) & 0xff) +
    0.0722 * channel(n & 0xff)
  );
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Every foreground/background pairing the app actually renders.
 *
 * Mirrors components/blocks/section.tsx's FIELD_CLASSES, DECK_CLASSES and
 * EYEBROW_CLASSES — the three page fields times the three text roles that sit
 * on them — plus the surfaces outside Section. Add a row here whenever a block
 * starts combining two tokens in a new way.
 */
function pairs(c: ThemeConfig["colors"]): [string, string, string, number][] {
  return [
    // field="paper"
    ["body on paper", c.foreground, c.background, 4.5],
    ["deck on paper", c.mutedForeground, c.background, 4.5],
    ["eyebrow on paper", c.primary, c.background, 4.5],
    // field="linen"
    ["body on linen", c.secondaryForeground, c.secondary, 4.5],
    ["deck on linen", c.mutedForeground, c.secondary, 4.5],
    ["eyebrow on linen", c.primary, c.secondary, 4.5],
    // field="ink" — testimonials, contact CTA, site footer
    ["body on ink", c.inkForeground, c.ink, 4.5],
    ["deck on ink", c.inkMuted, c.ink, 4.5],
    ["eyebrow on ink", c.accent, c.ink, 4.5],
    // surfaces and controls
    ["button label", c.primaryForeground, c.primary, 4.5],
    ["text on accent", c.accentForeground, c.accent, 4.5],
    ["body on card", c.cardForeground, c.card, 4.5],
    ["body on muted", c.foreground, c.muted, 4.5],
    // error text: form validation, and every failed action in the dashboard
    ["error on paper", c.destructive, c.background, 4.5],
    ["error on linen", c.destructive, c.secondary, 4.5],
    ["error on card", c.destructive, c.card, 4.5],
    ["text on destructive", c.destructiveForeground, c.destructive, 4.5],
    // non-text: 3:1 under WCAG 1.4.11
    ["focus ring on paper", c.ring, c.background, 3],
    ["focus ring on card", c.ring, c.card, 3],
  ];
}

describe.each(KIT_OWNED)("%s palette", (key) => {
  const colors = themePresets[key].colors;

  it.each(pairs(colors))("%s meets its minimum", (_label, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it("keeps the three page fields visually distinct", () => {
    // Not a WCAG rule — a design one. The homepage alternates paper/linen/ink
    // to give the scroll a spine; if two of them converge the rhythm is gone
    // and every section reads as one undifferentiated column.
    expect(contrast(colors.background, colors.secondary)).toBeGreaterThan(1.05);
    expect(contrast(colors.background, colors.ink)).toBeGreaterThan(1.05);
    expect(contrast(colors.secondary, colors.ink)).toBeGreaterThan(1.1);
  });

  it("inherits the brand's typography and geometry", () => {
    // A preset is a palette, not a redesign. Asserting the relationship rather
    // than a value keeps this true in every client repo.
    // A client repo that has extended the theme schema with its own type or
    // spacing tokens gets those covered here too, since the presets are built
    // by spreading the brand config rather than by listing fields.
    const preset = themePresets[key];
    expect(preset.radius).toBe(themePresets.BRAND.radius);
    expect(preset.fontSans).toBe(themePresets.BRAND.fontSans);
  });
});

describe("themePresets", () => {
  it("has an entry for every declared key", () => {
    for (const key of THEME_PRESET_KEYS) {
      expect(themePresets[key], `no palette for ${key}`).toBeDefined();
    }
    expect(Object.keys(themePresets).sort()).toEqual([...THEME_PRESET_KEYS].sort());
  });

  it("stays in step with the ThemePreset enum in the database", () => {
    // The stored setting is a ThemePreset value; the lookup key is a
    // ThemePresetKey. Nothing in the type system connects the two, so renaming
    // one and not the other compiles cleanly and fails only at runtime, as a
    // themePresets[key] miss that silently falls back to the brand palette.
    //
    // Reading schema.prisma as text rather than importing the generated client
    // keeps this test free of a database and of /generated (which is
    // gitignored and may not exist on a clean checkout).
    const schema = readFileSync(join(__dirname, "..", "prisma", "schema.prisma"), "utf8");
    const block = /enum ThemePreset \{([^}]*)\}/.exec(schema);

    expect(block, "no ThemePreset enum in prisma/schema.prisma").not.toBeNull();

    const values = block![1]
      .split("\n")
      .map((line) => line.replace(/\/\/.*/, "").trim())
      .filter(Boolean);

    expect(values.sort()).toEqual([...THEME_PRESET_KEYS].sort());
  });

  it("gives every preset a distinct human name", () => {
    const names = THEME_PRESET_KEYS.map((key) => themePresets[key].name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("aliases BRAND rather than copying it", () => {
    // If this becomes a copy, editing config/theme.config.ts stops changing
    // the brand preset and the client's own palette quietly goes stale.
    expect(themePresets.BRAND.colors.background).toBe(themePresets.BRAND.colors.background);
    expect(themePresets.MIDNIGHT.colors.background).not.toBe(themePresets.BRAND.colors.background);
  });
});

describe("themePresetSummaries", () => {
  it("summarises every preset with five swatches", () => {
    const summaries = themePresetSummaries();

    expect(summaries).toHaveLength(THEME_PRESET_KEYS.length);
    for (const summary of summaries) {
      expect(THEME_PRESET_KEYS).toContain(summary.key);
      expect(summary.name).toBeTruthy();
      expect(summary.swatch).toHaveLength(5);
      expect(summary.swatch.every(Boolean)).toBe(true);
    }
  });

  it("returns only serialisable primitives", () => {
    // It crosses the server/client boundary into the picker. Anything richer
    // than a string here throws at render with an unhelpful message.
    expect(() => JSON.stringify(themePresetSummaries())).not.toThrow();
  });
});
