import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Monogram } from "@/components/blocks/attorney-grid";
import { DemoDisclaimer } from "@/components/blocks/demo-disclaimer";
import { PageHeader } from "@/components/blocks/page-header";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site.config";
import { listTeam } from "@/features/team";
import { siteUrl } from "@/lib/env";
import { serialiseJsonLd } from "@/lib/structured-data";

/**
 * Reads the roster, which the firm edits without a redeploy.
 *
 * No `generateStaticParams`, deliberately: the params would be fixed at build
 * time, so adding a lawyer at /dashboard/settings would give them a page that
 * 404s until the next deploy. `TeamMember.slug` exists precisely so a person
 * has a stable public handle, and this is what finally uses it.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function findAttorney(slug: string) {
  const attorneys = await listTeam();
  return attorneys.find((attorney) => attorney.slug === slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const attorney = await findAttorney(slug);
  if (!attorney) return {};

  return {
    title: `${attorney.name} | ${siteConfig.business.name}`,
    // The bio is written as prose, so it is trimmed rather than reshaped —
    // a description cut mid-sentence still reads better than a generic one.
    description: attorney.bio.slice(0, 160),
    alternates: { canonical: `/attorneys/${attorney.slug}` },
  };
}

export default async function AttorneyPage({ params }: Params) {
  const { slug } = await params;
  const attorney = await findAttorney(slug);
  if (!attorney) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: attorney.name,
    jobTitle: attorney.role,
    description: attorney.bio,
    url: `${siteUrl}/attorneys/${attorney.slug}`,
    worksFor: {
      "@type": "Attorney",
      name: siteConfig.business.name,
      url: siteUrl,
      address: {
        "@type": "PostalAddress",
        addressLocality: siteConfig.business.address.city,
        addressRegion: siteConfig.business.address.state,
        addressCountry: siteConfig.business.address.country,
      },
    },
  };

  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialiseJsonLd(jsonLd) }}
      />

      <PageHeader
        eyebrow={attorney.role}
        title={attorney.name}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Attorneys", href: "/attorneys" },
          { label: attorney.name },
        ]}
      />

      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Monogram name={attorney.name} large />
          <p className="text-foreground text-lg leading-relaxed text-pretty">{attorney.bio}</p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/contact" className={buttonVariants()}>
            Get in touch
          </Link>
          <Link href="/attorneys" className={buttonVariants({ variant: "outline" })}>
            All attorneys
          </Link>
        </div>

        <DemoDisclaimer variant="inline" className="mt-10" />
      </div>
    </main>
  );
}
