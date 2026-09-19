import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Chatbot } from "@/components/blocks/chatbot";
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
      <body className="flex min-h-full flex-col">
        {/* Tells search engines this is a real business at a real address with
            real hours, rather than leaving them to infer it from prose. Built
            from the same config the page renders, so the two cannot disagree. */}
        <script
          type="application/ld+json"
          // Serialised through serialiseJsonLd, which escapes "<" so a config
          // value can never close this tag early.
          dangerouslySetInnerHTML={{
            // A merged config: `business` carries any edits the owner made at
            // /dashboard/settings, which must win over the committed defaults.
            //
            // PROVISIONAL_BUSINESS_FACTS is the third argument because this firm
            // is fictional. On a real public deploy the guard throws rather than
            // publishing an invented Attorney listing to search engines; in
            // development and on localhost it renders and carries on. See
            // specification.md 1.3.
            __html: serialiseJsonLd(
              buildLocalBusinessSchema(
                { ...siteConfig, business },
                siteUrl,
                PROVISIONAL_BUSINESS_FACTS,
              ),
            ),
          }}
        />
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
        <Chatbot />
      </body>
    </html>
  );
}
