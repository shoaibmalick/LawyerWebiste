import {
  hasLeadFilters,
  LeadFiltersForm,
  LeadList,
  listAllLeads,
  jurisdictionLabel,
  parseLeadFilters,
  practiceAreaLabel,
  type LeadRow,
} from "@/features/leads";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

/**
 * Describes what is on screen, in every combination.
 *
 * Always rendered, never conditional. The old copy only appeared when the
 * total exceeded the page size — so a filter matching 3 of 412 printed nothing
 * at all, and there was no way to tell whether it had done anything.
 */
function summarise(shown: number, matching: number, total: number, filtered: boolean): string {
  if (!filtered) {
    return matching > shown
      ? `Showing the ${shown} most recent of ${total} leads.`
      : `${total} ${total === 1 ? "lead" : "leads"}.`;
  }
  if (matching > shown) {
    return `Showing the ${shown} most recent of ${matching} matching leads (${total} in total).`;
  }
  return `${matching} of ${total} leads match these filters.`;
}

export default async function LeadsPage({
  searchParams,
}: {
  // Next 16 made searchParams a Promise — see the note in the reviews page for
  // why this is annotated explicitly rather than via PageProps.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Middleware is a redirect convenience, not the gate. proxy.ts matches
  // /dashboard/:path* and redirects, but Next.js has a documented
  // middleware-authorisation-bypass class (CVE-2025-29927) and a matcher is a
  // routing rule rather than a property of this page. requireAdmin asserts
  // role === "admin", so a signed-in *customer* — a valid session on the same
  // Auth.js instance — fails it here even if it reached this far.
  await requireAdmin();

  const params = await searchParams;
  const filters = parseLeadFilters(params);
  const filtered = hasLeadFilters(filters);

  // Filtering happens in the query, not over the rows already fetched. That
  // distinction is the whole point: the list is capped at 100, so a
  // client-side filter would only ever search the most recent 100 leads and
  // would silently fail to find an older one.
  const { leads, matching, total } = await listAllLeads(filters);

  const rows: LeadRow[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    status: lead.status,
    receivedLabel: formatDate(lead.createdAt),
    practiceAreaLabel: practiceAreaLabel(lead),
    jurisdictionLabel: jurisdictionLabel(lead.jurisdiction),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Messages from the contact form, and booking enquiries for treatments with no published
          availability.
        </p>
      </div>

      <LeadFiltersForm active={filters} />

      <p className="text-muted-foreground text-sm">
        {summarise(rows.length, matching, total, filtered)}
      </p>

      <LeadList
        leads={rows}
        emptyMessage={filtered ? "No leads match these filters." : "No messages yet."}
      />
    </div>
  );
}
