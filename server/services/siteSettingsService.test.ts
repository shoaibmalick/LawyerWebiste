import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { siteSettingsService } from "./siteSettingsService";

describe("siteSettingsService", () => {
  beforeEach(async () => {
    await prisma.siteSettings.deleteMany();
  });

  afterAll(async () => {
    await prisma.siteSettings.deleteMany();
    await prisma.$disconnect();
  });

  it("materialises the singleton row on first read", async () => {
    // The whole point of the upsert-on-read pattern: no caller, including the
    // root layout on a brand-new deployment, ever has to handle null.
    const settings = await siteSettingsService.getSettings();

    expect(settings.id).toBe(1);
    expect(settings.themePreset).toBe("BRAND");
    expect(settings.teamSeededAt).toBeNull();
  });

  it("round-trips a theme change", async () => {
    await siteSettingsService.setThemePreset("MIDNIGHT");
    expect((await siteSettingsService.getSettings()).themePreset).toBe("MIDNIGHT");

    await siteSettingsService.setThemePreset("HARBOUR");
    expect((await siteSettingsService.getSettings()).themePreset).toBe("HARBOUR");
  });

  it("writes the preset even when the row has never been read", async () => {
    // setThemePreset upserts rather than updates, so it works on a database
    // where nothing has hit getSettings yet.
    await siteSettingsService.setThemePreset("MIDNIGHT");

    expect((await siteSettingsService.getSettings()).themePreset).toBe("MIDNIGHT");
  });

  it("does not reset the theme when the settings are read again", async () => {
    // A read is an upsert. If its `update` were ever anything but empty, every
    // page load would clobber the client's choice.
    await siteSettingsService.setThemePreset("MIDNIGHT");
    await siteSettingsService.getSettings();
    await siteSettingsService.getSettings();

    expect((await siteSettingsService.getSettings()).themePreset).toBe("MIDNIGHT");
  });

  it("survives concurrent first reads", async () => {
    // This is not a hypothetical. The root layout reads the theme while the
    // homepage reads the roster (which also reads settings), in parallel, on
    // every single page load — so the very first request to a fresh
    // deployment races this function against itself. Prisma's upsert is not
    // always one INSERT … ON CONFLICT; when it degrades to find-then-create,
    // the loser gets a unique violation. It threw on a real page load before
    // getSettings learned to re-read.
    const results = await Promise.all(
      Array.from({ length: 8 }, () => siteSettingsService.getSettings()),
    );

    expect(results).toHaveLength(8);
    expect(results.every((row) => row.id === 1)).toBe(true);
    expect(await prisma.siteSettings.count()).toBe(1);
  });

  it("survives a write racing a first read", async () => {
    const [, ...reads] = await Promise.all([
      siteSettingsService.setThemePreset("HARBOUR"),
      siteSettingsService.getSettings(),
      siteSettingsService.getSettings(),
    ]);

    expect(reads.every((row) => row.id === 1)).toBe(true);
    expect((await siteSettingsService.getSettings()).themePreset).toBe("HARBOUR");
    expect(await prisma.siteSettings.count()).toBe(1);
  });

  it("keeps exactly one row however many times it is touched", async () => {
    await siteSettingsService.getSettings();
    await siteSettingsService.setThemePreset("HARBOUR");
    await siteSettingsService.getSettings();

    expect(await prisma.siteSettings.count()).toBe(1);
  });
});
