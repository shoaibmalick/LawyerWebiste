import { connection } from "next/server";
import { team as configTeam } from "@/config/content/team";
import { teamService } from "@/server/services/teamService";

/**
 * What every consumer of team data sees.
 *
 * Narrower than the Prisma row on purpose: `sortOrder`, `createdAt` and
 * `updatedAt` are storage concerns, and a block that receives them starts
 * being tempted to render them.
 */
export type TeamMemberRecord = {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  photo: string | null;
};

/**
 * The practice's staff list, in display order.
 *
 * `connection()` for the same reason as the theme read: a plain Prisma call in
 * a Server Component is invisible to Next's static analysis, so without it
 * /credits would prerender one roster at build time and serve it forever.
 *
 * Falls back to config/content/team.ts when the database is unreachable —
 * which is the same data the table would have been seeded with, so the page
 * renders correctly rather than failing the build.
 */
export async function listTeam(): Promise<TeamMemberRecord[]> {
  await connection();

  try {
    const rows = await teamService.listTeam();
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      role: row.role,
      bio: row.bio,
      photo: row.photo,
    }));
  } catch (error) {
    console.error("[team] could not read the roster; falling back to config", error);
    return configTeam.map((member) => ({
      id: member.slug,
      slug: member.slug,
      name: member.name,
      role: member.role,
      bio: member.bio,
      photo: member.photo ?? null,
    }));
  }
}
