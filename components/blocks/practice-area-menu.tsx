"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useHoverPointer } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export type MenuSection = {
  label: string;
  href: string;
  items: { label: string; href: string; summary: string }[];
};

/** How long the panel survives the pointer leaving it, in milliseconds. */
const CLOSE_GRACE_MS = 140;

/**
 * The practice-area dropdown in the header.
 *
 * ## Opens on hover, but only where hovering is a real thing
 *
 * This used to be click-only, and the reasoning it gave was sound as far as it
 * went: a hover menu is a trap on a touch screen, where the first tap both
 * opens the panel and follows the link underneath it. What it got wrong was
 * treating that as an argument against hover everywhere, rather than against
 * hover *on touch*. On a desktop, a menu that needs a click to reveal six links
 * makes the nav feel inert — you point at a thing that plainly has more behind
 * it and nothing happens.
 *
 * So the behaviour is chosen by what the pointer can actually do.
 * `useHoverPointer` asks for `(hover: hover) and (pointer: fine)` — a pointer
 * that can be *over* something without having committed to it. Everywhere else,
 * including every touch screen and every stylus, this is exactly the click menu
 * it was before. The query answers `false` on the server and on the first
 * client paint, so the click behaviour is also what renders before hydration;
 * hover is added, never assumed.
 *
 * Two details make hover usable rather than merely present:
 *
 * - **There is no gap to fall through.** The panel's offset from the trigger is
 *   padding *inside* the positioned element, not a margin outside it, so the
 *   pointer never crosses dead space on the way down. A margin here is the
 *   single most common reason a hover menu feels broken.
 * - **Leaving is forgiven for 140ms.** Pointers travel in arcs, not straight
 *   lines, and clipping the corner of the trigger on the way to the second item
 *   should not dismiss the thing you are reaching for.
 *
 * Clicking still works on every device: on a hover pointer it closes a panel
 * hover opened, which is what a trigger showing `aria-expanded` should do.
 *
 * ## The trigger is a button
 *
 * It opens something rather than going somewhere. The destination it would have
 * navigated to is the first row of the panel, spelled out, so it is reachable
 * rather than implied.
 */
export function PracticeAreaMenu({ section, current = false }: MenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverPointer = useHoverPointer();
  const reduceMotion = useReducedMotion();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  // Timers outlive renders. Without this, navigating away from a page with the
  // panel open leaves a setState scheduled against an unmounted component.
  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      // Focus goes back to the trigger. Closing a menu and dropping focus at
      // the top of the document is how a keyboard user loses their place.
      containerRef.current?.querySelector("button")?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    // Focus leaving the panel entirely closes it, which is what tabbing past
    // the last item should do.
    const onFocusIn = (event: FocusEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("focusin", onFocusIn);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  const hoverProps = hoverPointer
    ? {
        onPointerEnter: () => {
          cancelClose();
          setOpen(true);
        },
        onPointerLeave: () => {
          cancelClose();
          closeTimer.current = setTimeout(() => setOpen(false), CLOSE_GRACE_MS);
        },
      }
    : {};

  return (
    <div
      ref={containerRef}
      // `py-3 -my-3` widens the hover target to the full height of the header
      // bar without changing the layout: a 24px-tall label is a needle to aim
      // at, and the negative margin gives the padding back to the flex row.
      className="relative -my-3 py-3"
      {...hoverProps}
    >
      <button
        type="button"
        onClick={() => {
          cancelClose();
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-controls={panelId}
        /*
          Open and current are shown differently, and that is the point.

          The first attempt gave both the underline, so on a service page with
          the *other* menu open, two items were underlined and neither meant
          anything. The underline is reserved for "you are here"; open gets the
          darker label and the flipped chevron, which is what a disclosure
          should say about itself.
        */
        className={cn(NAV_TRIGGER, current && NAV_TRIGGER_ACTIVE, open && "text-foreground")}
      >
        {section.label}
        <ChevronDown
          aria-hidden
          className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {/*
        Always in the document, `hidden` when closed.

        Not conditionally rendered: `aria-controls` above names this id, and an
        aria-controls pointing at nothing is a broken reference rather than a
        closed one — axe reports it as a violation on every page of the site,
        because the audit runs with the menu shut.

        The offset from the trigger is `pt-2` on this element rather than `mt-2`,
        so the hoverable region is continuous from the label to the first link.
      */}
      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full left-1/2 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 pt-2"
      >
        {/*
          The card is a child, and it is what animates, so `initial` runs each
          time the panel opens. Animating this element instead would mean
          animating something that is `display: none` a frame earlier, which
          motion cannot do.

          Entrance only. With hover, panels open and close constantly as you
          sweep the nav, and an exit animation there reads as lag rather than as
          polish.
        */}
        {open && (
          <MenuPanel
            key={panelId}
            section={section}
            reduceMotion={reduceMotion}
            onNavigate={() => setOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

type MenuProps = {
  section: MenuSection;
  /** The reader is somewhere inside this section of the site. */
  current?: boolean;
};

function MenuPanel({
  section,
  reduceMotion,
  onNavigate,
}: {
  section: MenuSection;
  reduceMotion: boolean | null;
  onNavigate: () => void;
}) {
  const content = (
    <>
      <Link
        href={section.href}
        onClick={onNavigate}
        className="text-primary hover:bg-secondary focus-visible:ring-ring/50 group/all flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:outline-none"
      >
        All {section.label.toLowerCase()}
        <span
          aria-hidden
          className="transition-transform duration-200 group-hover/all:translate-x-0.5"
        >
          &rarr;
        </span>
      </Link>

      {/*
        Two columns from `sm` up. Six categories with a line of summary each is
        a 500px-tall ribbon in one column — long enough that the last two sit
        below the fold on a laptop, which is a strange thing to do to a menu.
      */}
      <ul className="mt-1 grid sm:grid-cols-2">
        {section.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className="hover:bg-secondary focus-visible:ring-ring/50 block h-full rounded-md px-3 py-2 transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              <span className="text-card-foreground block text-sm font-medium">{item.label}</span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                {item.summary}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );

  const className = "border-border bg-card rounded-lg border p-2 shadow-lg";

  /*
   * Distinct keys on the two branches, for the reason `components/motion/
   * reveal.tsx` documents at length: motion writes `opacity` and `transform`
   * onto the node imperatively, and React — seeing the same element type in the
   * same position — would reuse that node and never clear them. A reader who
   * asked for less motion would get a menu stuck at opacity 0.
   */
  if (reduceMotion) {
    return (
      <div key="panel-static" className={className}>
        {content}
      </div>
    );
  }

  return (
    <motion.div
      key="panel-animated"
      className={className}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
    >
      {content}
    </motion.div>
  );
}

/**
 * The shared look of a top-level nav item, trigger or link.
 *
 * Exported so `site-header.tsx` can put the plain links on exactly the same
 * rule. They drifted apart once already — the triggers were `gap-1` and the
 * links were not, which is invisible until the two sit next to each other.
 *
 * `min-h-6`: WCAG 2.2 SC 2.5.8 wants a 24px target and `text-sm` gives about
 * 20. The kit's `pointer-coarse:min-h-11` only fires where there is no mouse;
 * 2.5.8 applies regardless of pointer.
 *
 * The underline is a pseudo-element that scales from the centre rather than a
 * border that appears, so nothing shifts by a pixel when it arrives.
 */
export const NAV_TRIGGER =
  "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 relative inline-flex min-h-6 items-center gap-1 rounded-sm text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none " +
  // Faint, and only under the pointer: this rule means "you are about to pick
  // this", which is a different statement from the one below.
  "after:bg-foreground/25 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-center after:scale-x-0 after:rounded-full after:transition-transform after:duration-200 after:content-[''] " +
  "hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none";

/**
 * Applied when the reader is inside that part of the site.
 *
 * Solid brand colour, not the hover tint. Sharing one treatment made the nav
 * ambiguous in exactly the moment it matters: hovering "For Individuals" while
 * reading a `/business` page underlined both, and neither underline said which
 * was which. The permanent marker is darker than the transient one.
 */
export const NAV_TRIGGER_ACTIVE = "text-foreground after:bg-primary after:scale-x-100";
