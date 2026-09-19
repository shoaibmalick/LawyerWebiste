import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { CARD_SURFACE_INTERACTIVE } from "@/components/ui/card-surface";
import type { TeamMemberRecord } from "@/features/team";
import { excerpt } from "@/lib/excerpt";
import { cn } from "@/lib/utils";

/**
 * The roster.
 *
 * Text-only cards with an initials monogram rather than a photograph. The firm
 * is fictional and has no photography; a stock portrait captioned with an
 * invented lawyer's name and bar admissions is a claim about whoever is in the
 * picture. If this becomes a real firm's site, `photo` already exists on the
 * record and the monogram is the fallback.
 */
export function AttorneyGrid({ attorneys }: { attorneys: TeamMemberRecord[] }) {
  if (attorneys.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        The roster is being updated. Please get in touch and we will point you to the right person.
      </p>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {attorneys.map((attorney, index) => (
        <li key={attorney.slug}>
          <Reveal delay={index * 0.08} className="h-full">
            <Link
              href={`/attorneys/${attorney.slug}`}
              className={cn(CARD_SURFACE_INTERACTIVE, "group flex h-full flex-col p-6")}
            >
              <div className="flex items-center gap-4">
                <Monogram name={attorney.name} />
                <div className="min-w-0">
                  <h2 className="text-card-foreground font-semibold tracking-tight">
                    {attorney.name}
                  </h2>
                  <p className="text-primary mt-0.5 text-sm">{attorney.role}</p>
                </div>
              </div>

              {/*
                Cut to a sentence, not to a line.

                This was `line-clamp-4` on the whole bio, which clamps by line
                and therefore cut wherever the fourth line ran out: "…costs
                regime changes th…", "…a Canadian holding US-situs assets…".
                That reads as a rendering fault rather than an excerpt, and the
                cut point moves with the viewport, so there is no width at
                which the copy could have been written to fit.

                Every bio opens with one self-contained sentence naming what
                that lawyer does, which is what a card wants; the rest is detail
                for the page the card links to.
              */}
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                {excerpt(attorney.bio)}
              </p>

              <span className="text-primary mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium">
                Read more
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
                <span className="sr-only"> about {attorney.name}</span>
              </span>
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

/**
 * Initials, or a generic icon when a name yields none.
 *
 * `aria-hidden` because the name it is derived from sits immediately beside it
 * — announcing "AR" before "Aisha Rahman" is noise, not information.
 */
export function Monogram({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden
      className={
        large
          ? "bg-secondary text-primary flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold"
          : "bg-secondary text-primary flex size-12 shrink-0 items-center justify-center rounded-full font-semibold"
      }
    >
      {initials || <User className={large ? "size-8" : "size-5"} />}
    </span>
  );
}
