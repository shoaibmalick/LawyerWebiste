import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Chatbot } from "@/components/blocks/chatbot";
import { MobileActionBar } from "@/components/blocks/mobile-action-bar";
import { SiteFooter } from "@/components/blocks/site-footer";
import { SiteHeader } from "@/components/blocks/site-header";
import type { MenuSection } from "@/components/blocks/practice-area-menu";
import { practiceAreaPath } from "@/config/content/practice-areas";
import { PROVISIONAL_BUSINESS_FACTS, siteConfig } from "@/config/site.config";
import { listPracticeAreas } from "@/features/practice-areas";
import { getActiveTheme, getBusiness } from "@/features/site-settings";
import { isFeatureEnabled } from "@/lib/features";
import { siteUrl } from "@/lib/env";
import { buildLocalBusinessSchema, serialiseJsonLd } from "@/lib/structured-data";
import { themeConfigToCssVars } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

// Keyed by theme.config.ts's fontSans value — see the schema comment for why
// this is a closed set rather than an arbitrary Google Font name. The values
// here must match each font's own `variable` option above verbatim: a font
// object's `.variable` property is a generated class name (for `className`),
// not the CSS variable name itself, so it can't be used inside var().
const SANS_FONT_VARS = {
  geist: "--font-geist-sans",
  plusJakartaSans: "--font-plus-jakarta-sans",
} as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteConfig.seo.defaultTitle,
  description: siteConfig.seo.defaultDescription,
  alternates: { canonical: "/" },
  // Without these, sharing the business on WhatsApp, Facebook or iMessage
  // produces a bare URL with no title, description or image — on a site whose
  // whole job is being passed between people, that is a real loss. seo.ogImage
  // existed in the schema but nothing read it until now.
  openGraph: {
    type: "website",
    siteName: siteConfig.business.name,
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.seo.defaultDescription,
    url: siteUrl,
    ...(siteConfig.seo.ogImage ? { images: [{ url: siteConfig.seo.ogImage }] } : {}),
  },
  twitter: {
    card: siteConfig.seo.ogImage ? "summary_large_image" : "summary",
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.seo.defaultDescription,
    ...(siteConfig.seo.ogImage ? { images: [siteConfig.seo.ogImage] } : {}),
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Which of config/theme.presets.ts the client selected at
  // /dashboard/settings. Every route renders through this layout, so this is
  // what makes the choice site-wide rather than per-page.
  /**
   * The header's practice-area panels, built per request.
   *
   * Not a module constant, and not from config. Both were true until hiding a
   * category was tested end to end: the page 404'd correctly and the hub grid
   * dropped it, while the header on every page of the site went on linking to
   * it. A dead link in the primary nav is a worse outcome than the one hiding
   * was meant to produce.
   *
   * Passed down as plain data. The header is a client component, so importing
   * the content there would ship 48 services and 144 FAQs to render twelve links.
   */
  const [theme, business, businessAreas, individualAreas] = await Promise.all([
    getActiveTheme(),
    getBusiness(),
    listPracticeAreas("business"),
    listPracticeAreas("individual"),
  ]);

  const practiceAreaMenus: MenuSection[] = [
    { label: "For Business", href: "/business", areas: businessAreas },
    { label: "For Individuals", href: "/individuals", areas: individualAreas },
  ].map(({ label, href, areas }) => ({
    label,
    href,
    items: areas.map((area) => ({
      label: area.name,
      href: practiceAreaPath(area),
      summary: area.tagline,
    })),
  }));
  const activeSansFontVar = SANS_FONT_VARS[theme.fontSans];

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} h-full antialiased`}
      style={
        {
          ...themeConfigToCssVars(theme),
          // globals.css's `@theme inline` block aliases Tailwind's font-sans
          // token to this plain --font-sans var (same pattern as the color
          // tokens) — without this, it was self-referential and invalid,
          // silently falling back to the browser default instead of Geist.
          "--font-sans": `var(${activeSansFontVar})`,
        } as CSSProperties
      }
    >
      {/*
        Pays for MobileActionBar, which is `fixed` and so out of flow. Without it
        the bar covers the last rows of the footer on a phone — the legal links
        and the demo disclaimer among them.

        Computed rather than the `pb-14` the reference build uses, because 3.5rem
        is the row height and not the bar: there is a 1px `border-t` above it,
        and `env(safe-area-inset-bottom)` below it, which is ~34px of home
        indicator on a modern iPhone and 0 everywhere else. `pb-14` left the
        footer's last pixel under the border in a headless check and would have
        left ~35px of it under the bar on the device most likely to see this.
        Keyed to the same `sm` breakpoint that hides the bar.
      */}
      <body className="flex min-h-full flex-col pb-[calc(3.5rem+1px+env(safe-area-inset-bottom))] sm:pb-0">
        {/* Tells search engines this is a real business at a real address with
            real hours, rather than leaving them to infer it from prose. Built
            from the same config the page renders, so the two cannot disagree. */}
        {/*
          No `Attorney` listing while the firm's facts are invented.

          The guard behind `PROVISIONAL_BUSINESS_FACTS` exists to stop a fake
          business reaching search engines, and it enforced that by throwing on
          any public deploy. Correct, and it made the site undeployable: the call
          sits in the root layout, so a real hostname took out all 76 routes
          rather than one `<script>` tag.

          Not emitting the block reaches the guard's actual goal instead of its
          blunt version — nothing false is published, and the rest of the site
          gets to exist at a real URL with correct canonicals, sitemap and OG
          tags. The guard is still armed and still wired to the same list: fill
          in real details and empty the array, and the listing appears; leave one
          invented fact behind while claiming they are real, and
          `buildLocalBusinessSchema` throws exactly as before.

          So this is a narrower safeguard, not a removed one. See
          specification.md 1.3 and 7.18.
        */}
        {PROVISIONAL_BUSINESS_FACTS.length === 0 && (
          <script
            type="application/ld+json"
            // Serialised through serialiseJsonLd, which escapes "<" so a config
            // value can never close this tag early.
            dangerouslySetInnerHTML={{
              // A merged config: `business` carries any edits the owner made at
              // /dashboard/settings, which must win over the committed defaults.
              __html: serialiseJsonLd(
                buildLocalBusinessSchema(
                  { ...siteConfig, business },
                  siteUrl,
                  PROVISIONAL_BUSINESS_FACTS,
                ),
              ),
            }}
          />
        )}
        <SiteHeader
          business={business}
          nav={siteConfig.nav}
          menus={practiceAreaMenus}
          /*
             Resolved here, on the server, so the header does not have to pull
             the features config into the client bundle to decide its own label.

             Both hrefs are real routes, not in-page anchors. The kit's defaults
             were `#booking` and `#contact`, which worked when the whole site was
             one page; here /consultation and /contact are pages of their own,
             and `#contact` in particular pointed at a section that no longer
             exists at all since the "Visit us" band moved into the footer. An
             anchor to nothing scrolls nowhere and reports no error.
          */
          cta={
            isFeatureEnabled("booking")
              ? { label: "Book an appointment", href: "/consultation" }
              : { label: "Get in touch", href: "/contact" }
          }
        />
        {children}
        <SiteFooter business={business} hasFloatingAction={isFeatureEnabled("aiChatbot")} />
        <MobileActionBar business={business} />
        <Chatbot />
      </body>
    </html>
  );
}
