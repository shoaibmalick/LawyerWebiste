"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import {
  NAV_TRIGGER,
  NAV_TRIGGER_ACTIVE,
  PracticeAreaMenu,
  type MenuSection,
} from "@/components/blocks/practice-area-menu";
import { buttonVariants } from "@/components/ui/button";
import type { SiteConfig } from "@/config/schema/site.schema";
import { isCurrentSection } from "@/lib/nav";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  business: SiteConfig["business"];
  nav: SiteConfig["nav"];
  /** The one emphasised action. Pass null for a header with no button. */
  cta?: { label: string; href: string } | null;
  /**
   * Nav entries that open a panel instead of navigating, keyed by href.
   *
   * Resolved on the server and passed in, so the header does not import the
   * practice-area content itself - that would pull all 48 services and their
   * 144 FAQs into the client bundle to render twelve menu links.
   */
  menus?: MenuSection[];
};

/**
 * A fragment link that still works from a page other than the homepage.
 *
 * `#booking` resolves against whatever page you are currently on, so a header
 * link to it does nothing at all on `/services` — the browser looks for that
 * id on the services page, does not find it, and stays put. Rewriting to
 * `/#booking` sends the visitor home and then to the section.
 *
 * Everything else is passed through untouched, so `/services`, `tel:` and an
 * absolute URL all behave as written.
 */
function resolveHref(href: string): string {
  return href.startsWith("#") ? `/${href}` : href;
}

/**
 * The header: wordmark, the nav from config, and one button.
 *
 * ## It renders `siteConfig.nav`, and that is the point
 *
 * Golden Fork's header hardcoded its links, which made `nav` in
 * `config/site.config.ts` decorative — it could be edited, reordered or
 * corrected and nothing on the page moved. That was discovered by fixing five
 * dead links in the config and watching the header carry on serving the old
 * ones. A client repo that has no header at all has the same problem in a
 * quieter form: the salon build shipped a nav config nothing read, including
 * two entries pointing at sections that did not exist.
 *
 * ## One button
 *
 * When everything is emphasised nothing is. The nav items are links; the
 * single action a business actually wants — book, reserve, enquire — is the
 * button, and the label comes from the caller because "Book an appointment" is
 * wrong for a restaurant and "Reserve" is wrong for a dentist.
 *
 * ## Solid, not transparent over the hero
 *
 * A header that floats transparently over a photograph and turns solid on
 * scroll needs a scroll listener, and it renders unreadable on every page that
 * has no hero behind it — `/services`, `/credits`, `/login` — unless it also
 * knows which page it is on, which a layout-level component does not. Solid
 * with a blur is readable everywhere on the first frame, needs no JavaScript
 * for its main job, and costs the hero about 64px.
 *
 * It does lift off the page once you scroll, but that is a shadow rather than a
 * change of colour, and it is driven by an IntersectionObserver on a one-pixel
 * sentinel rather than by a scroll handler — no work on any frame where nothing
 * crossed the top of the page. The header still renders correctly before that
 * observer has ever fired.
 */
export function SiteHeader({ business, nav, cta, menus = [] }: SiteHeaderProps) {
  const menuByHref = new Map(menus.map((section) => [section.href, section]));
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const pathname = usePathname();
  const [lifted, setLifted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => setLifted(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Escape closes the menu. A disclosure that can only be dismissed by finding
  // the toggle again is a trap for anyone navigating by keyboard.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/*
        The scroll sentinel: one pixel, at the top of the document, outside the
        sticky header. When it leaves the viewport the page has been scrolled,
        which is the whole question — asked once per crossing rather than on
        every frame of every scroll.
      */}
      <div ref={sentinelRef} aria-hidden className="h-px" />

      <header
        className={cn(
          "border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur",
          "transition-shadow duration-300 motion-reduce:transition-none",
          lifted && "shadow-sm",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          {/*
          The monogram, then the name in live type.

          Not the full lockup. It is 579x363, so a header row that can spare
          about 32px of height would render its wordmark at roughly four pixels
          of cap height — a smudge that happens to be the firm's name. The mark
          survives that reduction because it is one letter; the name is set in
          the site's own typeface beside it, which stays crisp at every zoom
          level, reflows on a phone, and is selectable text rather than a
          picture of text.

          `alt=""` for the same reason: the name is already right there, and a
          screen reader announcing it twice is noise, not information.
        */}
          <Link
            href="/"
            /*
              Closes the mobile panel, like every other link in this header.
              The panel is a sibling of this link rather than a child, so it is
              the one navigable thing that used to leave it open: you tapped the
              logo, arrived home, and the menu was still covering it.

              Handled here rather than in an effect on `pathname`. Closing it
              from an effect is a setState during render's commit, which is the
              cascading-render the repo's lint rule rejects — and every other
              way out of this panel already closes it on click.
            */
            onClick={() => setOpen(false)}
            className="text-foreground hover:text-primary focus-visible:ring-ring/50 inline-flex min-h-6 items-center gap-2.5 rounded-sm text-base font-semibold tracking-tight transition-colors focus-visible:ring-3 focus-visible:outline-none sm:text-lg"
          >
            {business.logo && (
              <Image
                src={business.logo.mark.src}
                alt=""
                width={business.logo.mark.width}
                height={business.logo.mark.height}
                // In the header on every route, so it is worth the preload — and
                // it is small enough that the preload costs nothing.
                priority
                className="h-7 w-auto sm:h-9"
              />
            )}

            {/*
            Two spans, one hidden at a time, rather than one that wraps.

            The full name plus the monogram needs 235px and a 390px phone has
            about 204 to give, so it broke as "Harbourline Law / Group" and took
            the sticky header from 60px to 72 on every page. `hidden` is not
            announced, so a screen reader still hears the name once.
          */}
            <span className="hidden whitespace-nowrap sm:inline">{business.name}</span>
            <span className="whitespace-nowrap sm:hidden">
              {business.shortName ?? business.name}
            </span>
          </Link>

          {/*
          `min-h-6` on every link: WCAG 2.2 SC 2.5.8 wants a 24px target, and
          `text-sm` gives about 20. The kit's `pointer-coarse:min-h-11` rule only
          fires where there is no mouse, but 2.5.8 applies regardless of pointer.
          This passed until a fifth nav item was added and the spacing exception
          stopped applying - which is to say it was always marginal, and axe-core
          caught it the moment it tipped over.
        */}
          <nav aria-label="Main" className="ml-auto hidden items-center gap-6 lg:flex">
            {nav.map((item) => {
              const section = menuByHref.get(item.href);
              const current = isCurrentSection(pathname, item.href);

              return section ? (
                <PracticeAreaMenu key={item.href} section={section} current={current} />
              ) : (
                <Link
                  key={item.href}
                  href={resolveHref(item.href)}
                  /*
                  `aria-current` as well as the colour, because the underline is
                  the only thing saying "you are here" and a rule drawn in CSS
                  says nothing at all to a screen reader.
                */
                  aria-current={current ? "page" : undefined}
                  className={cn(NAV_TRIGGER, current && NAV_TRIGGER_ACTIVE)}
                >
                  {item.label}
                </Link>
              );
            })}
            {cta && (
              <Link href={resolveHref(cta.href)} className={cn(buttonVariants({ size: "sm" }))}>
                {cta.label}
              </Link>
            )}
          </nav>

          {/*
          The phone number is the mobile-first action for a local business, so
          it stays visible next to the toggle rather than being folded into the
          menu. `pointer-coarse:min-h-11` is the kit's touch-target rule.
        */}
          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <a
              href={`tel:${business.phone}`}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center rounded-md px-3 py-2 font-mono text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none pointer-coarse:min-h-11"
            >
              Call
            </a>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls={menuId}
              className="text-foreground focus-visible:ring-ring/50 inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium focus-visible:ring-3 focus-visible:outline-none pointer-coarse:min-h-11 pointer-coarse:min-w-11"
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {/*
        Rendered but hidden rather than unmounted, so the ids `aria-controls`
        points at exist whether or not the menu is open — an aria-controls
        naming an element that is not in the document is a broken reference,
        not a hidden one.
      */}
        <div id={menuId} hidden={!open} className="border-border bg-background border-t lg:hidden">
          <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {nav.map((item) => {
              const section = menuByHref.get(item.href);
              const current = isCurrentSection(pathname, item.href);

              return (
                <div key={item.href}>
                  <Link
                    href={resolveHref(item.href)}
                    onClick={() => setOpen(false)}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "text-foreground hover:bg-secondary focus-visible:ring-ring/50 -mx-2 block rounded-md px-2 py-3 text-base transition-colors focus-visible:ring-3 focus-visible:outline-none",
                      // A left rule rather than the desktop underline: these are
                      // full-width rows, and a 300px underline under one of them
                      // reads as a divider rather than as a marker.
                      current && "border-primary text-primary border-l-2 pl-3 font-medium",
                    )}
                  >
                    {item.label}
                  </Link>

                  {/*
                  Flat, not a nested disclosure. A menu already behind one toggle
                  does not need a second one per section: the whole point on a
                  phone is to see the twelve destinations and pick, and burying
                  them one tap deeper to save vertical space trades the thing
                  people came for against scrolling, which is free.
                */}
                  {section && (
                    <ul className="border-border mb-2 ml-3 border-l pl-3">
                      {section.items.map((entry) => (
                        <li key={entry.href}>
                          <Link
                            href={entry.href}
                            onClick={() => setOpen(false)}
                            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 block rounded-md py-2.5 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none pointer-coarse:min-h-11"
                          >
                            {entry.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {cta && (
              <Link
                href={resolveHref(cta.href)}
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ size: "lg" }), "mt-3 w-full")}
              >
                {cta.label}
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
