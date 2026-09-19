import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JurisdictionBadges } from "@/components/blocks/jurisdiction-badge";
import { PageHeader } from "@/components/blocks/page-header";
import { ServiceDetail } from "@/components/blocks/service-detail";
import { allServiceRoutes, audienceFromSegment } from "@/config/content/practice-areas";
import { findVisibleService } from "@/features/practice-areas";
import { siteConfig } from "@/config/site.config";
import { siteUrl } from "@/lib/env";
import { serialiseJsonLd } from "@/lib/structured-data";

/** See app/[segment]/page.tsx for why this is a dynamic segment with params off. */
export const dynamicParams = false;

export function generateStaticParams() {
  return allServiceRoutes().map((route) => ({
    segment: route.segment,
    category: route.category,
    service: route.service,
  }));
}

type Params = { params: Promise<{ segment: string; category: string; service: string }> };

/**
 * Resolve all three segments together.
 *
 * The service is looked up *within* its category rather than by
 * `findService(slug)` alone. Both would find it, but only this rejects
 * /business/intellectual-property/motor-vehicle-accidents - a URL that pairs a
 * real category with a real service belonging somewhere else. Left unchecked,
 * that renders a perfectly convincing page at an address whose breadcrumb lies
 * about where it sits.
 */
async function resolve({ params }: Params) {
  const { segment, category, service: serviceSlug } = await params;

  const audience = audienceFromSegment(segment);
  if (!audience) return undefined;

  // Resolves audience, category and service together, and only among visible
  // ones — so a hidden service 404s, and so does a real category paired with a
  // real service that belongs somewhere else.
  const found = await findVisibleService(audience, category, serviceSlug);
  return found ? { segment, area: found.area, service: found.service } : undefined;
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const resolved = await resolve(props);
  if (!resolved) return {};

  const { segment, area, service } = resolved;
  const path = `/${segment}/${area.slug}/${service.slug}`;

  return {
    title: service.seo.title,
    description: service.seo.description,
    alternates: { canonical: path },
    openGraph: {
      title: service.seo.title,
      description: service.seo.description,
      url: path,
      type: "article",
    },
  };
}

export default async function ServicePage(props: Params) {
  const resolved = await resolve(props);
  if (!resolved) notFound();

  const { segment, area, service } = resolved;
  const audienceLabel = area.audience === "business" ? "For business" : "For individuals";

  /**
   * LegalService, not Service.
   *
   * `areaServed` carries the jurisdictions the content declares rather than the
   * firm's office locations - a service scoped to Canada only must not claim to
   * be offered in the US because the firm happens to have a New York address.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: service.name,
    description: service.summary,
    url: `${siteUrl}/${segment}/${area.slug}/${service.slug}`,
    serviceType: area.name,
    areaServed: service.jurisdictions.map((code) => ({
      "@type": "Country",
      name: code === "CA" ? "Canada" : "United States",
    })),
    provider: {
      "@type": "Attorney",
      name: siteConfig.business.name,
      url: siteUrl,
    },
  };

  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialiseJsonLd(jsonLd) }}
      />

      <PageHeader
        eyebrow={area.name}
        title={service.name}
        deck={service.summary}
        crumbs={[
          { label: "Home", href: "/" },
          { label: audienceLabel, href: `/${segment}` },
          { label: area.name, href: `/${segment}/${area.slug}` },
          { label: service.name },
        ]}
      >
        <JurisdictionBadges jurisdictions={service.jurisdictions} />
      </PageHeader>

      <ServiceDetail area={area} service={service} />
    </main>
  );
}
