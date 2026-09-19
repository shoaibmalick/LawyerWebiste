import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { imageCredits } from "@/config/content/image-credits";
import { services } from "@/config/content/services";
import { siteConfig } from "@/config/site.config";
import { getBusiness } from "@/features/site-settings";
import { listTeam } from "@/features/team";
import { creditsForDisplayedImages } from "@/lib/image-credits";

export const metadata: Metadata = {
  title: `Image credits — ${siteConfig.business.name}`,
  description: "Photography credits and licences for images used on this site.",
  // A credits page has no business competing with the business's real pages in
  // search results.
  robots: { index: false, follow: true },
};

export default async function CreditsPage() {
  // A client using only its own photography has nothing to credit, and an
  // empty credits page is worse than none. SiteFooter hides its link under the
  // same condition, so this 404 is unreachable from the UI.
  if (imageCredits.length === 0) notFound();

  // Derived from what the site actually renders rather than from the list
  // itself. Team photos are editable from the dashboard now, so a hand-kept
  // list would start crediting photographers for pictures that had been
  // replaced — and a CC BY licence obliges the credit be visible for the
  // image that is actually shown. See lib/image-credits.ts.
  const team = await listTeam();
  const business = await getBusiness();
  const displayed = [
    /*
     * The hero photographs belong here too.
     *
     * This list was services + team, which is what the kit had images for. The
     * hero is now three licensed photographs and they are the most prominent
     * images on the site — omitting them meant /credits rendered its heading
     * over an empty list while the footer link pointed at it, which is exactly
     * the "empty credits page is worse than none" case the 404 above guards.
     *
     * Read from `business` rather than `siteConfig` so a hero swapped at
     * /dashboard/settings is credited too.
     */
    ...business.heroImages,
    business.heroImage,
    ...services.map((service) => service.image),
    ...team.map((member) => member.photo),
  ];
  const shown = creditsForDisplayedImages(imageCredits, displayed);

  const required = shown.filter((credit) => credit.attributionRequired);

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Photography credits
        </h1>
        <p className="text-muted-foreground mt-4 text-sm">
          The photographs on this site are licensed stock images. They are listed here with their
          creators, licences and sources.
        </p>

        <ul className="mt-10 flex flex-col gap-6">
          {shown.map((credit) => (
            <li key={credit.src} className="border-border border-t pt-5">
              <p className="text-foreground text-base font-medium">{credit.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {credit.usedFor} · by {credit.creator}
              </p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a
                  href={credit.licenseUrl}
                  rel="license noopener noreferrer"
                  target="_blank"
                  className="text-primary underline underline-offset-4"
                >
                  {credit.license}
                </a>
                <a
                  href={credit.sourceUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                >
                  Original
                </a>
              </p>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground mt-12 text-sm">
          {shown.length === 0
            ? "None of the images currently on this site require attribution."
            : required.length === 0
              ? "All images above are public domain; credit is given as a courtesy."
              : `${required.length} of these ${shown.length} licences ${
                  required.length === 1 ? "requires" : "require"
                } this credit to be shown. The rest are public domain and are listed as a courtesy.`}
        </p>
      </section>
    </main>
  );
}
