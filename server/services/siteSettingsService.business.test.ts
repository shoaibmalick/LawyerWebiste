import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { siteSettingsService } from "./siteSettingsService";

const NOTHING_OVERRIDDEN = {
  businessPhone: null,
  businessEmail: null,
  addressStreet: null,
  addressCity: null,
  addressState: null,
  addressZip: null,
  addressCountry: null,
  openingHours: null,
};

async function reset() {
  await siteSettingsService.saveBusinessContact(NOTHING_OVERRIDDEN);
}

beforeEach(reset);
afterAll(async () => {
  await reset();
  await prisma.$disconnect();
});

describe("saveBusinessContact", () => {
  it("stores an override and reads it back", async () => {
    await siteSettingsService.saveBusinessContact({
      ...NOTHING_OVERRIDDEN,
      businessPhone: "(905) 555-0199",
      businessEmail: "hello@example.test",
    });

    const settings = await siteSettingsService.getSettings();
    expect(settings.businessPhone).toBe("(905) 555-0199");
    expect(settings.businessEmail).toBe("hello@example.test");
  });

  /**
   * Clearing a field is the only way back to the configured value once
   * something has been saved, so it has to store SQL NULL rather than an empty
   * string — an empty string is a value, and `?? config` would not fall through
   * it.
   */
  it("clears an override back to null rather than to an empty string", async () => {
    await siteSettingsService.saveBusinessContact({
      ...NOTHING_OVERRIDDEN,
      businessPhone: "(905) 555-0199",
    });
    await siteSettingsService.saveBusinessContact(NOTHING_OVERRIDDEN);

    const settings = await siteSettingsService.getSettings();
    expect(settings.businessPhone).toBeNull();
  });

  it("writes the address as a set", async () => {
    await siteSettingsService.saveBusinessContact({
      ...NOTHING_OVERRIDDEN,
      addressStreet: "1 Test Lane",
      addressCity: "Aurora",
      addressState: "ON",
      addressZip: "L4G 0A1",
      addressCountry: "CA",
    });

    const settings = await siteSettingsService.getSettings();
    expect(settings.addressCity).toBe("Aurora");
    expect(settings.addressZip).toBe("L4G 0A1");
  });

  it("round-trips the opening hours, closed days included", async () => {
    const week = [
      { day: "mon", opens: null, closes: null },
      { day: "tue", opens: "10:00", closes: "19:00" },
      { day: "wed", opens: "10:00", closes: "19:00" },
      { day: "thu", opens: "10:00", closes: "19:00" },
      { day: "fri", opens: "10:00", closes: "19:00" },
      { day: "sat", opens: "09:00", closes: "17:00" },
      { day: "sun", opens: null, closes: null },
    ];

    await siteSettingsService.saveBusinessContact({ ...NOTHING_OVERRIDDEN, openingHours: week });

    const settings = await siteSettingsService.getSettings();
    expect(settings.openingHours).toEqual(week);
  });

  /**
   * A JSON column can hold the literal `null` as a *value*, which is a
   * different thing from the column being SQL NULL — and only the second one
   * falls through to config. Prisma needs `DbNull` to express it, which is easy
   * to get wrong and impossible to see afterwards without a test.
   */
  it("stores SQL NULL for absent hours, not the JSON literal null", async () => {
    await siteSettingsService.saveBusinessContact({
      ...NOTHING_OVERRIDDEN,
      openingHours: [{ day: "mon", opens: "09:00", closes: "17:00" }],
    });
    await siteSettingsService.saveBusinessContact(NOTHING_OVERRIDDEN);

    const [row] = await prisma.$queryRawUnsafe<{ isNull: boolean }[]>(
      'SELECT "openingHours" IS NULL AS "isNull" FROM "SiteSettings" WHERE id = 1',
    );
    expect(row.isNull).toBe(true);
  });

  it("leaves the other settings alone", async () => {
    const before = await siteSettingsService.getSettings();

    await siteSettingsService.saveBusinessContact({
      ...NOTHING_OVERRIDDEN,
      businessPhone: "(905) 555-0100",
    });

    const after = await siteSettingsService.getSettings();
    expect(after.themePreset).toBe(before.themePreset);
    expect(after.followUpDays).toBe(before.followUpDays);
  });
});
