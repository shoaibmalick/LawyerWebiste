import { siteConfig } from "@/config/site.config";
import { cn } from "@/lib/utils";

/**
 * The standing notice that this firm does not exist.
 *
 * Two variants of one sentence, in one component, because the two must never
 * drift apart: `full` closes the page in the footer, `inline` sits at the foot
 * of a practice-area or service page where someone has just read four hundred
 * words that look exactly like legal guidance.
 *
 * That second placement is the one that matters. A visitor who lands directly on
 * /individuals/personal-injury/motor-vehicle-accidents from a link has seen no
 * home page and no footer, and the page they are reading names real statutes,
 * real limitation periods and real filing deadlines. Saying so once, at the
 * bottom of the site, would not reach them.
 *
 * Do not remove either placement — specification.md 1.3.
 */

const FULL =
  "Harbourline Law Group LLP is a fictional firm and this site is a design demonstration. Nothing here is legal advice, and no solicitor-client or attorney-client relationship is created by using it.";

const INLINE =
  "This is demonstration content for a fictional firm, not legal advice. Laws, limitation periods and filing deadlines differ by province and state and change over time — speak to a licensed lawyer about your own situation.";

type DemoDisclaimerProps = {
  variant?: "full" | "inline";
  className?: string;
};

export function DemoDisclaimer({ variant = "full", className }: DemoDisclaimerProps) {
  const isInline = variant === "inline";

  return (
    <aside
      // A named landmark rather than a bare <p>: someone navigating by landmark
      // should be able to find this without reading the whole page to reach it.
      aria-label="Demonstration site notice"
      className={cn(
        isInline
          ? "border-border bg-secondary text-muted-foreground rounded-md border px-4 py-3 text-sm"
          : "text-muted-foreground text-xs leading-relaxed",
        className,
      )}
    >
      <strong className="text-foreground font-semibold">
        {isInline ? "Not legal advice." : "Demonstration site."}
      </strong>{" "}
      {isInline ? INLINE : FULL}
      {!isInline && (
        <>
          {" "}
          The address, telephone number and email shown for {siteConfig.business.name} are invented.
        </>
      )}
    </aside>
  );
}
