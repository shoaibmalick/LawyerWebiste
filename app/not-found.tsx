import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getBusiness } from "@/features/site-settings";
import { cn } from "@/lib/utils";

/**
 * Without this, a mistyped URL renders Next's built-in 404 — unstyled, in a
 * different typeface from the rest of the site, and with no route back. On a
 * marketing site the visitor who lands here arrived from a stale link or a
 * typo and is one click from leaving, so the job is to name the problem and
 * offer the two things they were probably after.
 */
export default async function NotFound() {
  const business = await getBusiness();

  return (
    <main className="flex flex-1 items-center px-6 py-24">
      <div className="mx-auto flex max-w-xl flex-col items-start gap-5">
        <p className="text-muted-foreground text-sm font-medium">404</p>
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          We couldn&apos;t find that page
        </h1>
        <p className="text-muted-foreground">
          The link may be out of date, or the address slightly off. Everything is still reachable
          from the homepage.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/" className={cn(buttonVariants())}>
            Back to the homepage
          </Link>
          <a href={`tel:${business.phone}`} className={cn(buttonVariants({ variant: "outline" }))}>
            Call {business.phone}
          </a>
        </div>
      </div>
    </main>
  );
}
