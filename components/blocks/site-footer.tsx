import Image from "next/image";
import Link from "next/link";
import { DemoDisclaimer } from "@/components/blocks/demo-disclaimer";
import { imageCredits } from "@/config/content/image-credits";
import type { SiteConfig } from "@/config/schema/site.schema";
import { siteConfig } from "@/config/site.config";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  business: SiteConfig["business"];
  /**
   * Reserve room at the foot of the page for a control pinned to the viewport.
   *
   * Named for the shape of the problem rather than for the chat widget, because
   * the footer should not have to know what is floating over it — only that
   * something is. Measured: the launcher covered the legal links at 390, 1024
   * and 1280, "Image credits" among them, which is the link that makes the
   * photographers' attribution reachable.
   */
  hasFloatingAction?: boolean;
};

/**
 * Four columns then a legal strip: the firm's name, where it is, the two
 * audiences, and its own pages.
 *
 * The contact details live here rather than in a "Visit us" section on the
 * homepage. A full band spent on a street address is a lot of page for
 * something nobody scrolls a homepage to find, and it competed with the one
 * action that page is asking for. In a footer it costs nothing and is where
 * people look for it anyway.
 *
 * The audience columns are repeated here rather than left to the header because
 * the footer is where someone looks after reading a page and deciding they are
 * in the wrong half of the site.
 */

const LEGAL_LINKS = [
  { label: "Disclaimer", href: "/legal/disclaimer" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
] as const;

export function SiteFooter({ business, hasFloatingAction = false }: SiteFooterProps) {
  const legalName = business.legalName ?? business.name;

  const audienceLinks = siteConfig.nav.filter(
    (item) => item.href === "/business" || item.href === "/individuals",
  );
  const firmLinks = siteConfig.nav.filter(
    (item) => item.href !== "/business" && item.href !== "/individuals",
  );

  return (
    <footer className="border-border bg-secondary mt-auto border-t">
      <div
        className={cn(
          "mx-auto max-w-6xl px-6 pt-12 pb-12",
          // 24px of inset plus a 48px launcher, and a little air under it.
          hasFloatingAction && "pb-28",
        )}
      >
        {/*
          A four-column grid, not flex with `justify-between`.
          Flex sized each group to its content and pushed the remainder into one
          gap, which left a wide hole after the firm name and squeezed the
          address into a column too narrow for "150 King Street West, Suite
          2200" to sit on one line. A grid gives every column the same share.
        */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/*
            The full lockup, where the header only gets the monogram.

            This is the one place on the page with room for it, and the one
            place whose job is to say whose site this is. The header has a row
            about 40px tall and four other things to fit into it; a footer
            column is 250-ish px wide with nothing above the tagline, which is
            roughly the size the lockup was drawn for.

            Alt text is the legal name rather than empty: unlike the header,
            nothing adjacent repeats it. The copyright line at the foot does,
            but it is far enough away to be a separate statement.
          */}
          <div>
            {business.logo ? (
              <Image
                src={business.logo.lockup.src}
                alt={legalName}
                width={business.logo.lockup.width}
                height={business.logo.lockup.height}
                className="h-auto w-44"
              />
            ) : (
              <p className="text-foreground text-base font-semibold">{legalName}</p>
            )}
            <p className="text-muted-foreground mt-3 text-sm">{business.tagline}</p>
          </div>

          {/*
              The firm's address and how to reach it.
              This used to be a full "Visit us" band on the homepage. A whole
              section spent on a street address is a lot of page for something
              nobody scrolls the homepage to find - and when they do want it,
              the footer is where they already look. It also competed with the
              one action the homepage is actually asking for.

              An <address> element, so it is announced as contact information
              rather than as three unrelated lines of text. `not-italic`
              because the browser default for <address> is italic and this is a
              postal address, not an aside.
            */}
          <address className="text-muted-foreground text-sm not-italic">
            <p className="text-foreground font-semibold">Toronto</p>
            <p className="mt-2 leading-relaxed">
              {business.address.street}
              <br />
              {business.address.city}, {business.address.state} {business.address.zip}
            </p>

            <p className="text-foreground mt-4 font-semibold">New York</p>
            <p className="mt-2 leading-relaxed">By appointment</p>

            <p className="mt-4 flex flex-col gap-1">
              <a
                href={`tel:${business.phone}`}
                className="hover:text-foreground focus-visible:ring-ring/50 inline-flex min-h-6 w-fit items-center rounded-sm font-mono underline-offset-4 transition-colors hover:underline focus-visible:ring-3 focus-visible:outline-none"
              >
                {business.phone}
              </a>
              <a
                href={`mailto:${business.email}`}
                className="hover:text-foreground focus-visible:ring-ring/50 inline-flex min-h-6 w-fit items-center rounded-sm break-all underline-offset-4 transition-colors hover:underline focus-visible:ring-3 focus-visible:outline-none"
              >
                {business.email}
              </a>
            </p>
          </address>

          <FooterColumn heading="Practice areas" links={audienceLinks} />
          <FooterColumn heading="Firm" links={firmLinks} />
        </div>

        <div className="border-border mt-10 border-t pt-6">
          <DemoDisclaimer variant="full" />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} {legalName}
            </p>

            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
              {/* Hidden while there is nothing to credit — /credits 404s in that
                  case, and a link to a 404 is worse than no link. A CC BY licence
                  requires the credit be reachable by visitors, so if this footer
                  is restyled again, keep it. */}
              {imageCredits.length > 0 && <FooterLink label="Image credits" href="/credits" />}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-foreground text-sm font-semibold">{heading}</p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <FooterLink {...link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 transition-colors hover:underline"
    >
      {label}
    </Link>
  );
}
