import { team as configTeam } from "@/config/content/team";
import { prisma } from "@/lib/prisma";
import { siteSettingsService } from "./siteSettingsService";

/**
 * Two saves raced and both tried to claim the same web address for a member.
 *
 * Slugs are derived and de-duplicated within a single save, so this cannot
 * happen inside one request — it is only reachable when two admins save
 * overlapping rosters at the same moment.
 */
export class DuplicateTeamSlugError extends Error {
  constructor() {
    super("A team member with that web address already exists");
    this.name = "DuplicateTeamSlugError";
  }
}

export type SaveTeamMemberInput = {
  /** Absent for a member being added. */
  id?: string;
  name: string;
  role: string;
  bio: string;
  photo?: string;
};

const ORDER = [{ sortOrder: "asc" as const }, { id: "asc" as const }];

/**
 * A URL-safe handle derived from the member's name.
 *
 * Never typed by an admin: nothing reads the slug today except the React key,
 * so asking a receptionist to invent one would be a validation error waiting
 * to happen in exchange for nothing.
 */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    // Strip the combining marks NFKD just split off, so "Núñez" becomes
    // "nunez" rather than "n-ez".
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // A name written entirely in a non-Latin script leaves nothing behind. The
  // caller appends an index, so these stay distinct.
  return slug || "member";
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * The practice's staff list, in display order.
 *
 * Falls back to seeding from config/content/team.ts the first time it is read
 * in a repo that has never had a roster — which is what lets a freshly cloned
 * client repo render its configured team with no extra onboarding step.
 *
 * The `teamSeededAt` check is what stops that fallback from becoming a bug: an
 * admin who removes every member has an empty roster on purpose, and without
 * the marker the config four would reappear on the next page load.
 */
async function listTeam() {
  const rows = await prisma.teamMember.findMany({ orderBy: ORDER });
  if (rows.length > 0) return rows;

  const settings = await siteSettingsService.getSettings();
  if (settings.teamSeededAt) {
    // Re-read rather than returning the empty `rows` captured above.
    //
    // Those two queries are not atomic. On a cold start the layout, the
    // homepage and the chatbot all reach this together; every one of them sees
    // no rows, one wins and seeds, and a loser then arrives here with the
    // marker *now* set and returns its own stale empty array — reporting "this
    // business has no team" while the roster sits committed in the table. On a
    // fresh deployment that is a homepage rendered with no team section.
    //
    // The deliberately-emptied case still works: the re-read returns nothing,
    // which is the honest answer there.
    return prisma.teamMember.findMany({ orderBy: ORDER });
  }

  return seedFromConfig();
}

async function seedFromConfig() {
  try {
    await prisma.$transaction(async (tx) => {
      // skipDuplicates rather than a lock: several cold requests arrive
      // together on a fresh deploy — the root layout, the homepage and the
      // chatbot all read this — and the unique slug index makes the losers
      // no-ops.
      await tx.teamMember.createMany({
        data: configTeam.map((member, index) => ({
          slug: slugify(member.name),
          name: member.name,
          role: member.role,
          bio: member.bio,
          photo: member.photo ?? null,
          sortOrder: index,
        })),
        skipDuplicates: true,
      });

      // updateMany, not upsert: listTeam has already materialised the row via
      // getSettings, and updateMany on a missing row is a harmless no-op
      // rather than a second insert to race on.
      await tx.siteSettings.updateMany({ where: { id: 1 }, data: { teamSeededAt: new Date() } });
    });
  } catch (error) {
    // Another request seeded first. Its rows are the ones we wanted anyway.
    if (!isUniqueViolation(error)) throw error;
  }

  return prisma.teamMember.findMany({ orderBy: ORDER });
}

/**
 * Replace the whole roster with `members`, in the order given.
 *
 * Wholesale rather than per-member: rewriting every sortOrder in one
 * transaction makes reorder, add, remove and edit a single atomic operation
 * and removes the entire class of "two rows both think they are third" bugs
 * that incremental ordering invites. With a roster capped at 50 the cost is
 * irrelevant.
 *
 * Concurrent saves are last-write-wins, deliberately: CLAUDE.md frames the
 * dashboard as a single-admin internal tool, and revision checking would be
 * real complexity for a conflict that needs two people editing staff bios in
 * the same minute.
 */
async function saveTeam(members: SaveTeamMemberInput[]) {
  // Materialise the settings row before the transaction, so the write below
  // can be a plain updateMany. Tolerates the concurrent-create race itself.
  await siteSettingsService.getSettings();

  try {
    return await prisma.$transaction(async (tx) => {
      // An id the client sent that no longer exists (deleted in another tab)
      // is treated as a new member rather than an error — the admin's intent
      // was to have this person on the list either way.
      const claimedIds = members.map((member) => member.id).filter((id) => id !== undefined);
      const surviving = await tx.teamMember.findMany({
        where: { id: { in: claimedIds } },
        select: { id: true },
      });
      const survivingIds = new Set(surviving.map((row) => row.id));

      // Explicit branch rather than `notIn: []`, whose "match everything"
      // reading is not something to rely on for a delete.
      if (survivingIds.size > 0) {
        await tx.teamMember.deleteMany({ where: { id: { notIn: [...survivingIds] } } });
      } else {
        await tx.teamMember.deleteMany();
      }

      // Park every surviving row on a slug nothing can want, so the final
      // assignment below cannot collide with one this same save is freeing up.
      // Renaming "Jane Doe" to "Jane Smith" while adding a new "Jane Doe" is
      // otherwise a unique-constraint failure that depends on row order.
      for (const id of survivingIds) {
        await tx.teamMember.update({ where: { id }, data: { slug: `__reassigning_${id}` } });
      }

      const taken = new Set<string>();
      for (const [index, member] of members.entries()) {
        const base = slugify(member.name);
        let slug = base;
        for (let suffix = 2; taken.has(slug); suffix++) slug = `${base}-${suffix}`;
        taken.add(slug);

        const data = {
          slug,
          name: member.name,
          role: member.role,
          bio: member.bio,
          photo: member.photo ?? null,
          sortOrder: index,
        };

        if (member.id !== undefined && survivingIds.has(member.id)) {
          await tx.teamMember.update({ where: { id: member.id }, data });
        } else {
          await tx.teamMember.create({ data });
        }
      }

      // An empty roster is a legitimate choice, so record that we have been
      // here — otherwise listTeam would treat it as "never initialised" and
      // seed the config members straight back in. updateMany because the row
      // was materialised above; an upsert here could race and be misreported
      // as a duplicate slug by the catch below.
      await tx.siteSettings.updateMany({ where: { id: 1 }, data: { teamSeededAt: new Date() } });

      return tx.teamMember.findMany({ orderBy: ORDER });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateTeamSlugError();
    throw error;
  }
}

export const teamService = {
  listTeam,
  saveTeam,
};
