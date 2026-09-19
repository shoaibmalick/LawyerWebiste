import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { siteUrl } from "@/lib/env";
import { serialiseJsonLd } from "@/lib/structured-data";

export type Crumb = {
  label: string;
  /** Omitted on the last crumb, which is the current page. */
  href?: string;
};

type BreadcrumbsProps = {
  items: Crumb[];
};

/**
 * The trail, and the BreadcrumbList JSON-LD that goes with it.
 *
 * Both from one array, because a breadcrumb rendered for a person and a
 * breadcrumb emitted for a crawler that disagree is worse than emitting
 * neither - structured data that contradicts the page is a reason for a search
 * engine to distrust everything else on it.
 *
 * Three levels deep is where this site lives
 * (/individuals -> a category -> a service), which is exactly the depth at
 * which someone arriving from a search result has no idea where they are.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      // The current page carries no `item`. schema.org's guidance is that the
      // last crumb is the page you are on, and pointing it at itself adds a
      // self-referential URL a crawler has to reconcile.
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialiseJsonLd(jsonLd) }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 opacity-50" />}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-foreground underline-offset-4 transition-colors hover:underline"
                  >
                    {item.label}
                  </Link>
                ) : (
                  // aria-current tells a screen-reader user which of these is
                  // the page they are on; visually that is obvious from the
                  // position, and non-visually it is not obvious at all.
                  <span className="text-foreground font-medium" aria-current="page">
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
