"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ThemePresetKey, ThemePresetSummary } from "@/config/theme.presets";
import { setThemePresetAction, type SiteSettingsActionResult } from "../api/set-theme-preset";

type ThemePickerProps = {
  active: ThemePresetKey;
  /**
   * Summaries rather than the presets themselves — a client component that
   * imported config/theme.presets.ts would pull three complete configs, every
   * type step and every spacing token into the browser bundle to render
   * fifteen coloured squares.
   */
  presets: ThemePresetSummary[];
};

const SWATCH_LABELS = ["Page", "Bands", "Dark sections", "Buttons and links", "Accents"];

export function ThemePicker({ active, presets }: ThemePickerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SiteSettingsActionResult | null>(null);
  const [selected, setSelected] = useState<ThemePresetKey>(active);

  function onSave() {
    setResult(null);
    startTransition(async () => {
      const outcome = await setThemePresetAction({ preset: selected });
      setResult(outcome);
      // Nothing is cached, so there is nothing to revalidate — but this page
      // was rendered before the change, and re-fetching it is what makes the
      // dashboard itself repaint in the palette just chosen. That repaint is
      // the clearest possible confirmation the save worked.
      if (outcome.ok) router.refresh();
    });
  }

  return (
    <section className="border-border flex flex-col gap-5 rounded-lg border p-5">
      <div>
        <h2 className="text-foreground text-lg font-medium">Theme</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Changes the colours of the whole website for every visitor. Typefaces, spacing and layout
          stay the same.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Website theme</legend>
        {presets.map((preset) => (
          <label
            key={preset.key}
            className="border-border flex cursor-pointer items-center gap-4 rounded-lg border p-4"
          >
            <input
              type="radio"
              name="theme-preset"
              value={preset.key}
              checked={selected === preset.key}
              onChange={() => setSelected(preset.key)}
              className="shrink-0"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-foreground text-sm font-medium">
                {preset.name}
                {preset.key === active && (
                  <span className="text-muted-foreground ml-2 font-normal">· in use</span>
                )}
              </span>
              <span className="flex gap-1.5" aria-hidden="true">
                {preset.swatch.map((colour, index) => (
                  <span
                    key={SWATCH_LABELS[index]}
                    title={SWATCH_LABELS[index]}
                    style={{ backgroundColor: colour }}
                    className="border-border h-6 w-10 rounded border"
                  />
                ))}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" onClick={onSave} disabled={pending || selected === active}>
          {pending ? "Applying…" : "Apply theme"}
        </Button>
        {result && (
          <p className={result.ok ? "text-foreground text-sm" : "text-destructive text-sm"}>
            {result.ok ? result.message : result.error}
          </p>
        )}
      </div>
    </section>
  );
}
