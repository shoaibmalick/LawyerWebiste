import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoDisclaimer } from "@/components/blocks/demo-disclaimer";
import { PageHeader } from "@/components/blocks/page-header";
import { PracticeAreaGrid } from "@/components/blocks/practice-area-grid";
import { buttonVariants } from "@/components/ui/button";
import { AUDIENCE_SEGMENT, audienceFromSegment } from "@/config/content/practice-areas";
import { listPracticeAreas } from "@/features/practice-areas";
import type { Audience } from "@/config/schema/practice-area.schema";

/**
 * The two audience hubs, /business and /individuals, from one implementation.
 *
 * A dynamic segment rather than two parallel trees. The pages are structurally
 * identical - six category cards over a header - and the only thing that
 * differs is which half of the content they read, so two copies would be two
 * places to fix every future change to the layout.
 *
 * `dynamicParams = false` is what makes that safe. This is a root-level dynamic
 * segment, so without it /anything-at-all would reach this file and have to be
 * hand-rejected; with it, Next serves the two params below and 404s everything
 * else before this component runs. Statically-defined siblings (/about,
 * /contact, /login, /api) still win on their own, because a literal segment
 * always beats a dynamic one.
 */
export const dynamicParams = false;

const COPY: Record<Audience, { eyebrow: string; title: string; deck: string; other: string }> = {
  business: {
    eyebrow: "For business",
    title: "Legal counsel for companies operating across the border",
    deck: "Six practice areas covering the whole life of a business - incorporating it, papering its revenue, protecting what it invents, employing people, holding property, and defending it when something goes wrong. Canadian and US law on one file.",
    other: "Looking for help with a personal matter?",
  },
  individual: {
    eyebrow: "For individuals and families",
    title: "Legal help when something in your life has gone wrong",
    deck: "Six practice areas covering injury, family breakdown, estates, criminal charges, your home, and immigration. If your situation touches both Canada and the United States, that is the part we do differently.",
    other: "Looking for help for your business?",
  },
};

export function generateStaticParams() {
  return Object.values(AUDIENCE_SEGMENT).map((segment) => ({ segment }));
}

type Params = { params: Promise<{ segment: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { segment } = await params;
  const audience = audienceFromSegment(segment);
  if (!audience) return {};

  const copy = COPY[audience];

  return {
    title: copy.title,
    description: copy.deck,
    alternates: { canonical: `/${segment}` },
  };
}

export default async function AudienceHub({ params }: Params) {
  const { segment } = await params;
  const audience = audienceFromSegment(segment);
  if (!audience) notFound();

  const copy = COPY[audience];
  const areas = await listPracticeAreas(audience);
  const otherAudience: Audience = audience === "business" ? "individual" : "business";
  const otherSegment = AUDIENCE_SEGMENT[otherAudience];

  return (
    <main className="flex-1">
      <PageHeader
        tone="ink"
        eyebrow={copy.eyebrow}
        title={copy.title}
        deck={copy.deck}
        crumbs={[{ label: "Home", href: "/" }, { label: copy.eyebrow }]}
      />

      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <PracticeAreaGrid areas={areas} />

        <div className="border-border mt-12 flex flex-col gap-4 rounded-lg border border-dashed p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">{copy.other}</p>
          <Link
            href={`/${otherSegment}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {COPY[otherAudience].eyebrow}
          </Link>
        </div>

        <DemoDisclaimer variant="inline" className="mt-10" />
      </div>
    </main>
  );
}
