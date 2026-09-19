"use client";

import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site.config";
import { cn } from "@/lib/utils";

/**
 * The route-level error boundary.
 *
 * Without it, an unhandled error in any page renders Next's built-in fallback —
 * in production a bare "Application error: a client-side exception has
 * occurred", with no branding, no phone number and no way back. For a business
 * whose site exists to get people to call, that is the worst possible moment to
 * show a dead end, so this keeps the phone number in front of them.
 *
 * `reset` re-renders the segment. Worth offering because a good share of these
 * are transient — a database blip during a slot lookup, say — and retrying
 * costs the visitor nothing.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side causes are already in the platform logs; this catches the
    // client-side ones, which otherwise leave no trace at all. `digest` is the
    // id Next puts in the server log, so it is the thread between the two.
    console.error("Unhandled application error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="flex flex-1 items-center px-6 py-24">
      <div className="mx-auto flex max-w-xl flex-col items-start gap-5">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          Sorry — that didn&apos;t load. Trying again often works. If it doesn&apos;t, please call
          us and we&apos;ll sort it out over the phone.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={cn(buttonVariants())}>
            Try again
          </button>
          <a
            href={`tel:${siteConfig.business.phone}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Call {siteConfig.business.phone}
          </a>
        </div>
        {error.digest && (
          // Gives the client something to quote when they report it, and gives
          // whoever investigates a key into the server logs.
          <p className="text-muted-foreground mt-2 text-xs">Reference: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
