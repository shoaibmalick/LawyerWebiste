import { Prisma } from "@/generated/prisma/client";
import type { ThemePreset } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * True for Prisma's unique-constraint error, however it surfaces.
 *
 * Checked structurally rather than with `instanceof
 * PrismaClientKnownRequestError` because the pg driver adapter can surface the
 * same failure wrapped differently — the same reason
 * bookingService::isWriteConflict does not rely on the class either.
 */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Site-wide presentation settings the client owns.
 *
 * Singleton row (id always 1): read is an upsert, so the row materialises on
 * first access and no caller ever has to handle null.
 *
 * The retry is not theoretical. Prisma's upsert does not always compile to a
 * single `INSERT … ON CONFLICT`; when it degrades to find-then-create, two
 * concurrent callers both find nothing and both insert, and one gets a unique
 * violation. That happens on an *ordinary page load* here, because the root
 * layout's theme read and the homepage's roster read run in parallel and both
 * land on this function. Losing the race is not an error — the winner created
 * exactly the row we wanted.
 */
async function getSettings() {
  try {
    return await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  }
}

async function setThemePreset(themePreset: ThemePreset) {
  try {
    return await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: { themePreset },
      create: { id: 1, themePreset },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Someone else created the row between our find and our insert; the value
    // we were asked to store still has to win.
    return prisma.siteSettings.update({ where: { id: 1 }, data: { themePreset } });
  }
}

async function setFollowUpDays(followUpDays: number) {
  try {
    return await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: { followUpDays },
      create: { id: 1, followUpDays },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return prisma.siteSettings.update({ where: { id: 1 }, data: { followUpDays } });
  }
}

/**
 * The contact details a business owns, written as one unit.
 *
 * Takes the whole set every time, nulls included, because the form posts the
 * whole set: a partial update could not express "clear this override", which is
 * the only way back to the configured value once something has been saved.
 *
 * Same upsert-then-update shape as the setters above, for the same reason — the
 * singleton row may not exist yet on a fresh deployment, and two concurrent
 * first writes must not leave one of them silently dropped.
 */
async function saveBusinessContact(contact: {
  businessPhone: string | null;
  businessEmail: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  addressCountry: string | null;
  openingHours: unknown;
}) {
  // Prisma types a nullable Json column as Prisma.InputJsonValue | JsonNull, so
  // a plain `null` has to be spelled out as DbNull to mean "store SQL NULL"
  // rather than the JSON literal `null` — two different things in the column.
  const openingHours =
    contact.openingHours === null ? Prisma.DbNull : (contact.openingHours as Prisma.InputJsonValue);

  const data = { ...contact, openingHours };

  try {
    return await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return prisma.siteSettings.update({ where: { id: 1 }, data });
  }
}

export const siteSettingsService = {
  getSettings,
  setThemePreset,
  setFollowUpDays,
  saveBusinessContact,
};
