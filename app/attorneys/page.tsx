import type { Metadata } from "next";
import { AttorneyGrid } from "@/components/blocks/attorney-grid";
import { DemoDisclaimer } from "@/components/blocks/demo-disclaimer";
import { PageHeader } from "@/components/blocks/page-header";
import { siteConfig } from "@/config/site.config";
import { listTeam } from "@/features/team";
import { siteUrl } from "@/lib/env";
import { serialiseJsonLd } from "@/lib/structured-data";

/**
 * The roster is a database read, editable by the firm at /dashboard/settings.
 * Prerendering would freeze it at build time.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our attorneys | Harbourline Law Group",
  description:
    "The lawyers at Harbourline Law Group, qualified in Ontario, Quebec and New York, advising on both sides of the Canada-US border.",
  alternates: { canonical: "/attorneys" },
};

export default async function AttorneysPage() {
  const attorneys = await listTeam();

  /**
   * An ItemList of Person, not a bare array.
   *
   * Each Person carries `worksFor` pointing at the firm, which is what ties the
   * individual to the organisation for a search engine. The firm's own
   * `Attorney` entity is emitted once in the root layout; repeating it in full
   * here would be two descriptions of one organisation that could disagree.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: attorneys.map((attorney, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Person",
        name: attorney.name,
        jobTitle: attorney.role,
        description: attorney.bio,
        url: `${siteUrl}/attorneys/${attorney.slug}`,
        worksFor: { "@type": "Attorney", name: siteConfig.business.name, url: siteUrl },
      },
    })),
  };

  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialiseJsonLd(jsonLd) }}
      />

      <PageHeader
        eyebrow="The firm"
        title="Our attorneys"
        deck="Six partners, qualified between Ontario, Quebec and New York. Cross-border matters are run by whichever two of them the file needs, on one set of advice rather than two."
        crumbs={[{ label: "Home", href: "/" }, { label: "Attorneys" }]}
      />

      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <AttorneyGrid attorneys={attorneys} />
        <DemoDisclaimer variant="inline" className="mt-12" />
      </div>
    </main>
  );
}
