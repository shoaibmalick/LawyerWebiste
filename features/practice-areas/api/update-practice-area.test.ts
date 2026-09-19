import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listAllPracticeAreas } from "@/config/content/practice-areas";
import { prisma } from "@/lib/prisma";

/**
 * The admin actions, and the guards that stand in front of them.
 *
 * `requireAdmin` is mocked so the *rest* of each action can be exercised, and
 * then unmocked-in-effect for the two tests that assert it is actually called.
 * Mocking it away entirely would leave the most important property of this
 * module — that every mutation re-checks authorisation for itself — untested.
 */
const auth = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@/lib/auth-guards", () => ({
  requireAdmin: vi.fn(async () => {
    if (!auth.isAdmin) throw new Error("NOT_AUTHORISED");
  }),
}));

const flags = vi.hoisted(() => ({ practiceAreasCms: true }));
vi.mock("@/lib/features", () => ({
  isFeatureEnabled: (name: string) => flags[name as keyof typeof flags] ?? false,
}));

import {
  reorderPracticeAreasAction,
  resetPracticeAreaAction,
  updatePracticeAreaAction,
} from "./update-practice-area";

const AREAS = listAllPracticeAreas();
const AREA = AREAS[0];
const SERVICE = AREA.services[0];

const VALID = {
  slug: SERVICE.slug,
  kind: "SERVICE" as const,
  visible: true,
  featured: false,
  summaryOverride: "",
  ctaOverride: "",
};

describe("practice-area admin actions", () => {
  beforeEach(async () => {
    auth.isAdmin = true;
    flags.practiceAreasCms = true;
    await prisma.practiceAreaOverride.deleteMany();
  });

  afterEach(async () => {
    await prisma.practiceAreaOverride.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("authorisation", () => {
    it("refuses a save when the caller is not an admin", async () => {
      auth.isAdmin = false;
      await expect(updatePracticeAreaAction(VALID)).rejects.toThrow("NOT_AUTHORISED");
      expect(await prisma.practiceAreaOverride.count()).toBe(0);
    });

    it("refuses a reorder when the caller is not an admin", async () => {
      auth.isAdmin = false;
      await expect(
        reorderPracticeAreasAction({ kind: "CATEGORY", slugs: AREAS.map((a) => a.slug) }),
      ).rejects.toThrow("NOT_AUTHORISED");
    });

    it("refuses a reset when the caller is not an admin", async () => {
      auth.isAdmin = false;
      await expect(resetPracticeAreaAction({ slug: SERVICE.slug })).rejects.toThrow(
        "NOT_AUTHORISED",
      );
    });
  });

  describe("feature flag", () => {
    it("refuses every mutation when the CMS is off", async () => {
      // An action reachable while its feature is off is the same failure as a
      // route reachable while its feature is off.
      flags.practiceAreasCms = false;

      expect(await updatePracticeAreaAction(VALID)).toEqual({
        ok: false,
        error: "The practice-area CMS is turned off.",
      });
      expect(await prisma.practiceAreaOverride.count()).toBe(0);
    });
  });

  describe("updatePracticeAreaAction", () => {
    it("creates a row and reports success", async () => {
      const result = await updatePracticeAreaAction({ ...VALID, visible: false, featured: true });
      expect(result).toEqual({ ok: true, message: "Saved." });

      const row = await prisma.practiceAreaOverride.findUniqueOrThrow({
        where: { slug: SERVICE.slug },
      });
      expect(row.visible).toBe(false);
      expect(row.featured).toBe(true);
    });

    it("normalises a blank override to null rather than an empty string", async () => {
      // Two representations of "unchanged" would mean every read site has to
      // check for both, and one of them eventually would not.
      await updatePracticeAreaAction({ ...VALID, summaryOverride: "   " });

      const row = await prisma.practiceAreaOverride.findUniqueOrThrow({
        where: { slug: SERVICE.slug },
      });
      expect(row.summaryOverride).toBeNull();
    });

    it("rejects a slug the content does not have", async () => {
      // A row for a slug that names nothing would be invisible in the admin
      // table, un-deletable through the UI, and applying to nothing.
      const result = await updatePracticeAreaAction({ ...VALID, slug: "not-a-real-service" });
      expect(result.ok).toBe(false);
      expect(await prisma.practiceAreaOverride.count()).toBe(0);
    });

    it("rejects a category slug submitted as a service", async () => {
      const result = await updatePracticeAreaAction({ ...VALID, slug: AREA.slug });
      expect(result.ok).toBe(false);
    });

    it("rejects a malformed payload without touching the table", async () => {
      expect((await updatePracticeAreaAction({ slug: "x" })).ok).toBe(false);
      expect((await updatePracticeAreaAction({ ...VALID, visible: "yes" })).ok).toBe(false);
      expect(await prisma.practiceAreaOverride.count()).toBe(0);
    });

    it("updates in place rather than creating a second row", async () => {
      await updatePracticeAreaAction({ ...VALID, featured: true });
      await updatePracticeAreaAction({ ...VALID, featured: false });

      expect(await prisma.practiceAreaOverride.count()).toBe(1);
    });
  });

  describe("reorderPracticeAreasAction", () => {
    it("writes a contiguous order for the list it was given", async () => {
      const slugs = AREAS.map((a) => a.slug);
      const result = await reorderPracticeAreasAction({ kind: "CATEGORY", slugs });
      expect(result.ok).toBe(true);

      const rows = await prisma.practiceAreaOverride.findMany({ orderBy: { sortOrder: "asc" } });
      expect(rows.map((r) => r.slug)).toEqual(slugs);
      expect(rows.map((r) => r.sortOrder)).toEqual(slugs.map((_, i) => i));
    });

    it("rejects a list containing a duplicate", async () => {
      // Two items claiming one position resolve to whatever the sort settles on.
      const result = await reorderPracticeAreasAction({
        kind: "CATEGORY",
        slugs: [AREA.slug, AREA.slug],
      });
      expect(result.ok).toBe(false);
      expect(await prisma.practiceAreaOverride.count()).toBe(0);
    });

    it("rejects a list naming something the content does not have", async () => {
      const result = await reorderPracticeAreasAction({
        kind: "CATEGORY",
        slugs: [AREA.slug, "invented-category"],
      });
      expect(result.ok).toBe(false);
      expect(await prisma.practiceAreaOverride.count()).toBe(0);
    });
  });

  describe("resetPracticeAreaAction", () => {
    it("deletes the row so config applies again", async () => {
      await updatePracticeAreaAction({ ...VALID, visible: false });
      expect(await prisma.practiceAreaOverride.count()).toBe(1);

      const result = await resetPracticeAreaAction({ slug: SERVICE.slug });
      expect(result.ok).toBe(true);
      expect(await prisma.practiceAreaOverride.count()).toBe(0);
    });

    it("is a no-op for a slug with no row", async () => {
      // Deliberately not an error: clearing a row for content that has since
      // been renamed is exactly the cleanup somebody would want.
      expect((await resetPracticeAreaAction({ slug: "gone-away" })).ok).toBe(true);
    });
  });
});
