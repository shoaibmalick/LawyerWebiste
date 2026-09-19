import { services } from "@/config/content/services";
import { siteConfig } from "@/config/site.config";
import { AvailabilityManager, listUpcomingAvailability } from "@/features/booking";
import { requireAdmin } from "@/lib/auth-guards";

// Reads live slot state, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  // Middleware is a redirect convenience, not the gate. proxy.ts matches
  // /dashboard/:path* and redirects, but Next.js has a documented
  // middleware-authorisation-bypass class (CVE-2025-29927) and a matcher is a
  // routing rule rather than a property of this page. requireAdmin asserts
  // role === "admin", so a signed-in *customer* — a valid session on the same
  // Auth.js instance — fails it here even if it reached this far.
  await requireAdmin();

  const { slots, total } = await listUpcomingAvailability();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          These are the times customers can book on the website. When this list runs out, the
          booking calendar is empty.
        </p>
      </div>

      {total > slots.length && (
        <p className="text-muted-foreground text-sm">
          Showing the next {slots.length} of {total} upcoming slots.
        </p>
      )}

      <AvailabilityManager
        services={services}
        slots={slots}
        timezone={siteConfig.business.timezone}
      />
    </div>
  );
}
