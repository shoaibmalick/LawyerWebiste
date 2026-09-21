import { CalendarCheck, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";

import type { SiteConfig } from "@/config/schema/site.schema";
import { whatsappUrl } from "@/config/site.config";
import { cn } from "@/lib/utils";

type MobileActionBarProps = {
  business: SiteConfig["business"];
};

/**
 * Call · WhatsApp · Directions · Book, pinned to the bottom on phones.
 *
 * Someone looking for a lawyer is often doing it in a bad week, on a phone, and
 * the thing they want is not a form — it is to talk to somebody. Every one of
 * those is a thumb away from any page here, including the fifty-odd
 * practice-area pages a search engine drops people onto directly, which
 * otherwise have no call-to-action above the footer.
 *
 * Four columns, not the five the reference build uses. Its fifth is "Packages",
 * and this firm has no equivalent single page: practice areas fork into
 * /business and /individuals, so any one link there is wrong for half the
 * visitors. Four also gives each cell 97px at 390px rather than 78px, which is
 * what lets the labels sit under icons instead of beside them.
 *
 * ## Things that look cosmetic and are not
 *
 * - **`sm:hidden`.** A desktop visitor has the header, which carries the same
 *   actions. This is not a second navigation, it is the phone's version of one.
 * - **`pb-[env(safe-area-inset-bottom)]`.** Without it the bar sits under the
 *   home indicator on a modern iPhone and eats its own taps — the control is
 *   visible, reachable and simply does not fire.
 * - **`min-h-14` on every cell.** 56px, above the 44px in CLAUDE.md's touch
 *   target note. A bar that is hard to hit is worse than no bar, because the
 *   mis-taps land on whatever is behind it.
 * - **The body carries `pb-14 sm:pb-0`** (app/layout.tsx). This bar is `fixed`
 *   and therefore out of flow, so without that padding it covers the last rows
 *   of the footer on a phone — including the legal links, which is where the
 *   demo disclaimer lives.
 *
 * ## `business` is a prop, not a config read
 *
 * The header and footer both render `getBusiness()` — config merged with
 * whatever the owner has edited at /dashboard/settings. Importing `siteConfig`
 * here would leave this bar showing the committed number while the rest of the
 * page showed the edited one, and this is the button a phone visitor is most
 * likely to press. The wa.me link is the exception: it is derived from config at
 * module scope, because `whatsapp` is not something the dashboard edits yet.
 */
export function MobileActionBar({ business }: MobileActionBarProps) {
  const mapsQuery = encodeURIComponent(
    `${business.name}, ${business.address.street}, ${business.address.city}, ${business.address.state}`,
  );

  // Null when the configured number cannot be parsed into a wa.me link — see
  // `whatsappUrl`. The column drops and the grid closes up to three, rather
  // than publishing a link that opens a chat with nobody.
  const columns = whatsappUrl ? "grid-cols-4" : "grid-cols-3";

  return (
    <div className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <nav aria-label="Quick actions" className={cn("grid", columns)}>
        <BarLink href={`tel:${business.phone}`} label="Call" icon={<Phone aria-hidden />} />
        {whatsappUrl && (
          <BarLink
            href={whatsappUrl}
            label="WhatsApp"
            icon={<MessageCircle aria-hidden />}
            external
          />
        )}
        <BarLink
          href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
          label="Directions"
          icon={<MapPin aria-hidden />}
          external
        />
        <BarLink href="/consultation" label="Book" icon={<CalendarCheck aria-hidden />} emphasis />
      </nav>
    </div>
  );
}

function BarLink({
  href,
  label,
  icon,
  external = false,
  emphasis = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
  emphasis?: boolean;
}) {
  const className = cn(
    "focus-visible:ring-ring/50 flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-center text-[0.6875rem] leading-none font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none [&_svg]:size-5",
    emphasis
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "text-foreground hover:bg-muted",
  );

  // A `tel:` or an off-site URL is a document navigation, not a route change,
  // so next/link would only add a client-side router that immediately hands
  // back to the browser.
  if (external || href.startsWith("tel:")) {
    return (
      <a href={href} className={className} {...(external ? { rel: "noreferrer" } : {})}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {icon}
      {label}
    </Link>
  );
}
