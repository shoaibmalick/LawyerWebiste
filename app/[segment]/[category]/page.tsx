import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoDisclaimer } from "@/components/blocks/demo-disclaimer";
import { PageHeader } from "@/components/blocks/page-header";
import { ServiceCardGrid } from "@/components/blocks/service-card-grid";
import { allCategoryRoutes, audienceFromSegment } from "@/config/content/practice-areas";
import { findVisiblePracticeArea } from "@/features/practice-areas";

/** See app/[segment]/page.tsx for why this is a dynamic segment with params off. */
export const dynamicParams = false;

export function generateStaticParams() {
  return allCategoryRoutes().map((route) => ({
    segment: route.segment,
    category: route.category,
  }));
}

type Params = { params: Promise<{ segment: string; category: string }> };

/**
 * Resolve the URL to content, or nothing.
 *
 * Both halves matter. `generateStaticParams` means only real pairs are built,
 * but the audience still has to be checked against the category: without it
 * /business/family-law would be a valid-looking URL for a category that belongs
 * to the other audience, and `findPracticeArea` scoping the lookup by audience
 * is what makes that a 404 rather than a page.
 */
async function resolve({ params }: Params) {
  const { segment, category } = await params;
  const audience = audienceFromSegment(segment);
  if (!audience) return undefined;

  /*
   * The visibility-aware lookup, so a hidden category 404s rather than merely
   * dropping off the hub. `generateStaticParams` above still enumerates every
   * category from config on purpose: params are fixed at build time, and
   * building only the visible ones would mean un-hiding something needed a
   * deploy, which defeats the CMS.
   */
  const area = await findVisiblePracticeArea(audience, category);
  return area ? { segment, area } : undefined;
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const resolved = await resolve(props);
  if (!resolved) return {};

  const { segment, area } = resolved;

  return {
    title: area.seo.title,
    description: area.seo.description,
    alternates: { canonical: `/${segment}/${area.slug}` },
  };
}

export default async function CategoryPage(props: Params) {
  const resolved = await resolve(props);
  if (!resolved) notFound();

  const { segment, area } = resolved;
  const audienceLabel = area.audience === "business" ? "For business" : "For individuals";

  return (
    <main className="flex-1">
      <PageHeader
        eyebrow={audienceLabel}
        title={area.name}
        deck={area.tagline}
        crumbs={[
          { label: "Home", href: "/" },
          { label: audienceLabel, href: `/${segment}` },
          { label: area.name },
        ]}
      />

      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <p className="text-foreground max-w-3xl text-lg leading-relaxed text-pretty">
          {area.overview}
        </p>

        <h2 className="text-foreground mt-12 mb-5 text-xl font-semibold tracking-tight">
          How we help
        </h2>
        <ServiceCardGrid area={area} services={area.services} />

        <DemoDisclaimer variant="inline" className="mt-12" />
      </div>
    </main>
  );
}
