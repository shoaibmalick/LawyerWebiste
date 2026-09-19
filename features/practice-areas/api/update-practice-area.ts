"use server";

import { findPracticeArea, findService } from "@/config/content/practice-areas";
import { requireAdmin } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/features";
import { practiceAreaService } from "@/server/services/practiceAreaService";
import {
  reorderPracticeAreasSchema,
  resetPracticeAreaSchema,
  updatePracticeAreaSchema,
} from "../schema/practice-area-override.schema";

export type PracticeAreaActionResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Admin mutations for the practice-area CMS.
 *
 * Every one of them re-checks `requireAdmin()` itself. `proxy.ts` matches
 * /dashboard/:path* and redirects, but a Server Action is a POST to its own
 * endpoint rather than a page navigation - the matcher is a routing rule, not a
 * property of this function, and Next.js has a documented
 * middleware-authorisation-bypass class (CVE-2025-29927). The guard also
 * asserts `role === "admin"`, so a signed-in *customer* on the same Auth.js
 * instance fails it.
 *
 * And every one re-checks the feature flag. An action reachable while its
 * feature is off is the same failure as a route reachable while its feature is
 * off, and CLAUDE.md treats them as one rule.
 */

async function guard(): Promise<PracticeAreaActionResult | null> {
  await requireAdmin();
  if (!isFeatureEnabled("practiceAreasCms")) {
    return { ok: false, error: "The practice-area CMS is turned off." };
  }
  return null;
}

/**
 * A slug is only editable if the content still has it.
 *
 * The form posts a slug back, so it is client-supplied. Without this, an
 * override row could be created for a slug that names nothing - invisible in
 * the admin table (which lists config, not rows), permanently un-deletable
 * through the UI, and applying to nothing. A row nobody can see or remove is
 * worse than a rejected save.
 */
function slugExists(slug: string, kind: "CATEGORY" | "SERVICE"): boolean {
  if (kind === "SERVICE") return findService(slug) !== undefined;
  return (
    findPracticeArea("business", slug) !== undefined ||
    findPracticeArea("individual", slug) !== undefined
  );
}

export async function updatePracticeAreaAction(input: unknown): Promise<PracticeAreaActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const parsed = updatePracticeAreaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Those changes could not be saved." };

  const { slug, kind } = parsed.data;
  if (!slugExists(slug, kind)) {
    return { ok: false, error: `"${slug}" is not a practice area in the current content.` };
  }

  await practiceAreaService.upsertOverride(parsed.data);
  return { ok: true, message: "Saved." };
}

export async function reorderPracticeAreasAction(
  input: unknown,
): Promise<PracticeAreaActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const parsed = reorderPracticeAreasSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That order could not be saved." };

  const { kind, slugs } = parsed.data;

  // Duplicates would make two items claim one position, and the resulting order
  // is whichever the sort happens to settle on.
  if (new Set(slugs).size !== slugs.length) {
    return { ok: false, error: "That order could not be saved." };
  }

  const unknown = slugs.filter((slug) => !slugExists(slug, kind));
  if (unknown.length > 0) {
    return { ok: false, error: "That order refers to something not in the current content." };
  }

  await practiceAreaService.reorder(kind, slugs);
  return { ok: true, message: "Order saved." };
}

/** Delete the row, so config applies again. */
export async function resetPracticeAreaAction(input: unknown): Promise<PracticeAreaActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const parsed = resetPracticeAreaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That could not be reset." };

  // No existence check: removing a row for a slug the content no longer has is
  // exactly the cleanup somebody would want, and deleteMany on a missing row is
  // a no-op rather than an error.
  await practiceAreaService.resetOverride(parsed.data.slug);
  return { ok: true, message: "Reset to the published content." };
}
