import type { PracticeAreaOverride } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The override rows, and nothing else.
 *
 * This layer knows about the table. It does not know what a practice area is,
 * which is deliberate: merging rows onto config is a content concern and lives
 * in features/practice-areas/api/list-practice-areas.ts. Keeping the two apart
 * is what stops the config import leaking into a Prisma service and, from
 * there, into places that only wanted a row.
 */

export type PracticeAreaOverrideInput = {
  slug: string;
  kind: "CATEGORY" | "SERVICE";
  visible: boolean;
  featured: boolean;
  summaryOverride: string | null;
  ctaOverride: string | null;
};

/** Every override, keyed by slug, for a single merge pass. */
async function listOverrides(): Promise<Map<string, PracticeAreaOverride>> {
  const rows = await prisma.practiceAreaOverride.findMany();
  return new Map(rows.map((row) => [row.slug, row]));
}

/**
 * Columns named one by one, never `data: input`.
 *
 * Same rule as leadService, and the same reason: the set of writable fields is
 * decided here, at the write, rather than inferred from whatever the schema
 * happens to contain. `sortOrder` is absent because it is not this form's to
 * set — reordering is its own operation, and a save from the edit row must not
 * silently move an item.
 */
async function upsertOverride(input: PracticeAreaOverrideInput) {
  return prisma.practiceAreaOverride.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      kind: input.kind,
      visible: input.visible,
      featured: input.featured,
      summaryOverride: input.summaryOverride,
      ctaOverride: input.ctaOverride,
    },
    update: {
      kind: input.kind,
      visible: input.visible,
      featured: input.featured,
      summaryOverride: input.summaryOverride,
      ctaOverride: input.ctaOverride,
    },
  });
}

/**
 * Write an explicit, contiguous order for one kind.
 *
 * One transaction: a half-applied reorder leaves two items claiming the same
 * position, and the list would render in an order nobody chose. Rows are
 * created where they do not exist, because ordering an item is itself a
 * decision worth recording.
 */
async function reorder(kind: "CATEGORY" | "SERVICE", slugs: string[]) {
  return prisma.$transaction(
    slugs.map((slug, index) =>
      prisma.practiceAreaOverride.upsert({
        where: { slug },
        create: { slug, kind, sortOrder: index },
        update: { sortOrder: index },
      }),
    ),
  );
}

/**
 * Delete the row, restoring config.
 *
 * Deleting rather than nulling every column: "no row" is the one unambiguous
 * representation of unchanged, and it is what a freshly cloned repo has.
 */
async function resetOverride(slug: string) {
  await prisma.practiceAreaOverride.deleteMany({ where: { slug } });
}

export const practiceAreaService = {
  listOverrides,
  upsertOverride,
  reorder,
  resetOverride,
};
