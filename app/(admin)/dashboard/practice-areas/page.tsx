import { notFound } from "next/navigation";
import { listAllPracticeAreas } from "@/config/content/practice-areas";
import { PracticeAreaAdminTable, type AdminGroup } from "@/features/practice-areas";
import { requireAdmin } from "@/lib/auth-guards";
import { isFeatureEnabled } from "@/lib/features";
import { practiceAreaService } from "@/server/services/practiceAreaService";

/** Reads live override state. Must never prerender. */
export const dynamic = "force-dynamic";

export default async function PracticeAreasPage() {
  // Defence in depth — see the note in the leads page, and CVE-2025-29927.
  await requireAdmin();

  // Gated at the route as well as in the nav. A disabled feature has to be
  // unreachable by URL or the flag is decorative.
  if (!isFeatureEnabled("practiceAreasCms")) notFound();

  const overrides = await practiceAreaService.listOverrides();

  /*
   * Built from CONFIG, not from the merged read.
   *
   * The public list drops hidden items by design; this page is the only place
   * that must still show them, because otherwise hiding something would remove
   * the control that un-hides it.
   */
  const groups: AdminGroup[] = listAllPracticeAreas().map((area) => {
    const categoryOverride = overrides.get(area.slug);

    return {
      audience: area.audience,
      category: {
        slug: area.slug,
        kind: "CATEGORY" as const,
        name: area.name,
        configText: area.tagline,
        configCta: null,
        visible: categoryOverride?.visible ?? true,
        featured: categoryOverride?.featured ?? false,
        summaryOverride: categoryOverride?.summaryOverride ?? null,
        ctaOverride: null,
        overridden: categoryOverride !== undefined,
      },
      services: area.services.map((service) => {
        const override = overrides.get(service.slug);
        return {
          slug: service.slug,
          kind: "SERVICE" as const,
          name: service.name,
          configText: service.summary,
          configCta: service.cta,
          visible: override?.visible ?? true,
          featured: override?.featured ?? false,
          summaryOverride: override?.summaryOverride ?? null,
          ctaOverride: override?.ctaOverride ?? null,
          overridden: override !== undefined,
        };
      }),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Practice areas</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Hide, promote, reorder and reword what appears on the site. The wording itself lives in
          the published content &mdash; anything left blank here uses that. {groups.length}{" "}
          categories, {groups.reduce((n, g) => n + g.services.length, 0)} services.
        </p>
      </div>

      <PracticeAreaAdminTable groups={groups} />
    </div>
  );
}
