import { requireAdmin } from "@/lib/auth-guards";
import { leadService, type LeadFilters } from "@/server/services/leadService";

/**
 * Contact-form submissions for the dashboard, narrowed by the active filters.
 *
 * Guarded even though it only reads. This is exported from the feature barrel,
 * so anything in the app can reach it, and it returns every customer's name,
 * email address, phone number and message — the most sensitive data the site
 * holds. proxy.ts covers the page it is called from today, but that is a
 * routing rule rather than a property of this function.
 */
export async function listAllLeads(filters: LeadFilters = {}) {
  await requireAdmin();

  return leadService.listAllLeads(filters);
}
