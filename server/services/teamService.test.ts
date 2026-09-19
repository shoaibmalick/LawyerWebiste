import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { team as configTeam } from "@/config/content/team";
import { prisma } from "@/lib/prisma";
import { teamService } from "./teamService";

/**
 * Assertions here are about relationships, not values: they compare against
 * whatever config/content/team.ts holds rather than naming this practice's
 * dentists, because test files do not diverge between client repos (CLAUDE.md
 * Conventions) and the next client's roster is different people.
 */
describe("teamService", () => {
  beforeEach(async () => {
    await prisma.teamMember.deleteMany();
    await prisma.siteSettings.deleteMany();
  });

  afterAll(async () => {
    await prisma.teamMember.deleteMany();
    await prisma.siteSettings.deleteMany();
    await prisma.$disconnect();
  });

  describe("listTeam", () => {
    it("seeds from config the first time it is read", async () => {
      // This is what lets a freshly cloned client repo render its configured
      // team with no extra onboarding step.
      const members = await teamService.listTeam();

      expect(members).toHaveLength(configTeam.length);
      expect(members.map((m) => m.name)).toEqual(configTeam.map((m) => m.name));
      expect(members.map((m) => m.sortOrder)).toEqual(configTeam.map((_, i) => i));
    });

    it("marks the roster as seeded so the fallback fires only once", async () => {
      await teamService.listTeam();

      const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
      expect(settings?.teamSeededAt).toBeInstanceOf(Date);
    });

    it("does not duplicate the roster when read repeatedly", async () => {
      await teamService.listTeam();
      await teamService.listTeam();
      await teamService.listTeam();

      expect(await prisma.teamMember.count()).toBe(configTeam.length);
    });

    it("seeds exactly once when several cold requests arrive together", async () => {
      // A fresh deployment gets the layout, the homepage and possibly the
      // chatbot all reading this at once. Each finds an empty table and tries
      // to seed; the unique slug index has to make the losers no-ops rather
      // than errors, and the roster must not end up duplicated.
      const results = await Promise.all(Array.from({ length: 5 }, () => teamService.listTeam()));

      for (const roster of results) {
        expect(roster.map((m) => m.name)).toEqual(configTeam.map((m) => m.name));
      }
      expect(await prisma.teamMember.count()).toBe(configTeam.length);
    });

    it("leaves a deliberately emptied roster empty", async () => {
      // The bug this guards: "no rows means seed from config" would resurrect
      // the config roster for a practice that had removed everyone — a solo
      // practitioner deleting three of four people, then the fourth, watching
      // all four reappear on the next page load.
      await teamService.listTeam();
      await teamService.saveTeam([]);

      expect(await teamService.listTeam()).toEqual([]);
      expect(await teamService.listTeam()).toEqual([]);
    });

    it("returns members in sortOrder, not insertion order", async () => {
      const seeded = await teamService.listTeam();
      const reversed = [...seeded].reverse();

      await teamService.saveTeam(
        reversed.map((m) => ({ id: m.id, name: m.name, role: m.role, bio: m.bio })),
      );

      const listed = await teamService.listTeam();
      expect(listed.map((m) => m.name)).toEqual(reversed.map((m) => m.name));
    });
  });

  describe("saveTeam", () => {
    it("renumbers sortOrder contiguously from zero", async () => {
      const saved = await teamService.saveTeam([
        { name: "Ada Lovelace", role: "Dentist", bio: "First." },
        { name: "Grace Hopper", role: "Hygienist", bio: "Second." },
        { name: "Alan Turing", role: "Coordinator", bio: "Third." },
      ]);

      expect(saved.map((m) => m.sortOrder)).toEqual([0, 1, 2]);
      expect(saved.map((m) => m.name)).toEqual(["Ada Lovelace", "Grace Hopper", "Alan Turing"]);
    });

    /**
     * These two build their own roster rather than reading the seeded one.
     *
     * They used to call `listTeam()` and index `[0]`, which silently required
     * config/content/team.ts to be non-empty — so a client whose business
     * genuinely has no public team (MegaCity: the client asked for no
     * instructors section) failed them with "Cannot read properties of
     * undefined". That is the shared suite failing on a legitimate client
     * configuration, which makes it a defect in the test rather than in the
     * config.
     *
     * It also contradicted this file's own opening note — that assertions here
     * are about relationships, not values, precisely because the next client's
     * roster is different people. A test that needs *some* people should make
     * them, and these now do.
     *
     * OWED UPSTREAM. The fix belongs in the template; it is here because
     * MegaCity cannot ship a red suite while it waits.
     */
    it("deletes members left out of the save", async () => {
      const seeded = await teamService.saveTeam([
        { name: "Ada Lovelace", role: "Instructor", bio: "First." },
        { name: "Grace Hopper", role: "Instructor", bio: "Second." },
      ]);
      const keep = seeded[0];

      const saved = await teamService.saveTeam([
        { id: keep.id, name: keep.name, role: keep.role, bio: keep.bio },
      ]);

      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe(keep.id);
      expect(await prisma.teamMember.count()).toBe(1);
    });

    it("updates an existing member in place, keeping its id", async () => {
      const [first] = await teamService.saveTeam([
        { name: "Ada Lovelace", role: "Instructor", bio: "First." },
      ]);

      const saved = await teamService.saveTeam([
        { id: first.id, name: "Renamed Person", role: "New Role", bio: "New bio." },
      ]);

      expect(saved[0].id).toBe(first.id);
      expect(saved[0].name).toBe("Renamed Person");
      expect(saved[0].role).toBe("New Role");
    });

    it("derives distinct slugs for two members with the same name", async () => {
      const saved = await teamService.saveTeam([
        { name: "Jane Doe", role: "Dentist", bio: "One." },
        { name: "Jane Doe", role: "Hygienist", bio: "Another." },
      ]);

      expect(saved[0].slug).not.toBe(saved[1].slug);
      expect(new Set(saved.map((m) => m.slug)).size).toBe(2);
    });

    it("lets a new member take a slug the same save is freeing up", async () => {
      // The unique index makes this order-dependent without the two-phase
      // reassignment in saveTeam: renaming Jane while adding a new Jane would
      // otherwise collide, depending purely on which row was written first.
      const [existing] = await teamService.saveTeam([
        { name: "Jane Doe", role: "Dentist", bio: "The original." },
      ]);
      expect(existing.slug).toBe("jane-doe");

      const saved = await teamService.saveTeam([
        { name: "Jane Doe", role: "Hygienist", bio: "Newly hired." },
        { id: existing.id, name: "Jane Smith", role: "Dentist", bio: "Married." },
      ]);

      expect(saved.map((m) => m.name)).toEqual(["Jane Doe", "Jane Smith"]);
      expect(saved[0].slug).toBe("jane-doe");
      expect(saved[0].id).not.toBe(existing.id);
      expect(saved[1].id).toBe(existing.id);
    });

    it("treats an unknown id as a new member rather than failing", async () => {
      // The admin's intent was to have this person on the list; a row deleted
      // in another tab shouldn't turn that into an error.
      const saved = await teamService.saveTeam([
        { id: "does-not-exist", name: "Ada Lovelace", role: "Dentist", bio: "Hello." },
      ]);

      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe("Ada Lovelace");
      expect(saved[0].id).not.toBe("does-not-exist");
    });

    it("stores an absent photo as null rather than dropping the member", async () => {
      const saved = await teamService.saveTeam([
        { name: "Ada Lovelace", role: "Dentist", bio: "No photo yet." },
        { name: "Grace Hopper", role: "Hygienist", bio: "Has one.", photo: "/images/team/g.jpg" },
      ]);

      expect(saved[0].photo).toBeNull();
      expect(saved[1].photo).toBe("/images/team/g.jpg");
    });

    it("produces a usable slug for a name with no Latin characters", async () => {
      const saved = await teamService.saveTeam([
        { name: "中村 医師", role: "Dentist", bio: "One." },
        { name: "山田 医師", role: "Hygienist", bio: "Two." },
      ]);

      expect(saved.every((m) => m.slug.length > 0)).toBe(true);
      expect(new Set(saved.map((m) => m.slug)).size).toBe(2);
    });

    it("strips accents rather than mangling them into separators", async () => {
      const [saved] = await teamService.saveTeam([
        { name: "Núñez Ortega", role: "Dentist", bio: "One." },
      ]);

      expect(saved.slug).toBe("nunez-ortega");
    });

    it("is atomic — a failed save leaves the previous roster intact", async () => {
      const before = await teamService.listTeam();

      await expect(
        teamService.saveTeam([
          { name: "Fine Person", role: "Dentist", bio: "ok" },
          // `bio` is non-nullable in the database; the Zod boundary rejects
          // this long before here, but the transaction must still hold.
          { name: "Broken", role: "Dentist", bio: null as unknown as string },
        ]),
      ).rejects.toThrow();

      const after = await teamService.listTeam();
      expect(after.map((m) => m.name)).toEqual(before.map((m) => m.name));
    });
  });
});
