"use server";

import { requireAdmin } from "@/lib/auth-guards";
import { teamPhotoService } from "@/server/services/teamPhotoService";
import { DuplicateTeamSlugError, teamService } from "@/server/services/teamService";
import { saveTeamSchema } from "../schema/team.schema";

export type TeamActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function saveTeamAction(input: unknown): Promise<TeamActionResult> {
  await requireAdmin();

  const parsed = saveTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Some of those details aren't valid.",
    };
  }

  let saved;
  try {
    saved = await teamService.saveTeam(parsed.data.members);
  } catch (error) {
    if (error instanceof DuplicateTeamSlugError) {
      return {
        ok: false,
        error: "Someone else saved the team at the same moment. Reload the page and try again.",
      };
    }
    throw error;
  }

  /**
   * Sweep uploads nothing points at any more.
   *
   * Uploading happens before saving, so an admin who picks a photo and then
   * changes their mind leaves a row behind. Deliberately best-effort: the save
   * itself succeeded, and failing the whole action because a cleanup query
   * errored would report a lost roster edit that in fact went through.
   */
  await teamPhotoService.deleteUnreferencedPhotos().catch((error) => {
    console.error("[team] could not sweep unreferenced photos", error);
  });

  // No revalidation: listTeam calls connection(), so the homepage and
  // /credits both read the roster per-request.
  if (saved.length === 0) {
    return { ok: true, message: "Team removed. The homepage no longer shows a team section." };
  }
  return {
    ok: true,
    message: `Saved ${saved.length} team member${saved.length === 1 ? "" : "s"}.`,
  };
}
