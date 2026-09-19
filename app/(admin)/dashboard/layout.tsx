import Link from "next/link";
import { auth, signOut } from "@/auth";
import { isFeatureEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/auth-guards";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Middleware is a redirect convenience, not the gate. proxy.ts matches
  // /dashboard/:path* and redirects, but Next.js has a documented
  // middleware-authorisation-bypass class (CVE-2025-29927) and a matcher is a
  // routing rule rather than a property of this page. requireAdmin asserts
  // role === "admin", so a signed-in *customer* — a valid session on the same
  // Auth.js instance — fails it here even if it reached this far.
  await requireAdmin();

  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/*
        Wraps, deliberately. This row was `flex justify-between` with a
        non-wrapping nav and an email address next to it, which gave it a
        min-content of 626px — so every admin page scrolled sideways on any
        phone, and on a small tablet held in portrait. A flex row without
        `flex-wrap` cannot get narrower than its contents, and nothing in
        `app/` sets an `overflow-x` guard to catch it.
      */}
      <header className="border-border flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b px-4 py-4 sm:px-6">
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
          <Link href="/dashboard/bookings" className="text-foreground">
            Bookings
          </Link>
          {isFeatureEnabled("booking") && (
            <Link href="/dashboard/availability" className="text-foreground">
              Availability
            </Link>
          )}
          <Link href="/dashboard/leads" className="text-foreground">
            Leads
          </Link>
          {isFeatureEnabled("reviews") && (
            <Link href="/dashboard/reviews" className="text-foreground">
              Reviews
            </Link>
          )}
          {/* Gated in both places: the route 404s on the same flag, so a link
              that outlived its feature would go nowhere. */}
          {isFeatureEnabled("practiceAreasCms") && (
            <Link href="/dashboard/practice-areas" className="text-foreground">
              Practice areas
            </Link>
          )}
          {/* Ungated: the theme and team sections apply to every client, so
              this used to be a link that never rendered in any repo with
              payments switched off. */}
          <Link href="/dashboard/settings" className="text-foreground">
            Settings
          </Link>
        </nav>
        <div className="flex items-center gap-4 text-sm">
          {/*
            Hidden on the narrowest screens, and truncated above them. An email
            address is one unbreakable token — this was the single widest thing
            in the header — and it answers "who am I signed in as", which is
            worth a line of chrome on a laptop and not worth a line of a phone
            screen. Sign out stays visible at every width, because that is the
            action.
          */}
          <span className="text-muted-foreground hidden max-w-[18ch] truncate sm:inline">
            {session?.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-foreground underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {/*
        Steps down on small screens. This padding sits outside a card's `p-4`
        and often an inner panel's `p-4` too, so at 360px the nesting was
        spending about a fifth of the viewport on chrome before any content.
      */}
      <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
