import type { Prisma } from "@/generated/prisma/client";
import type { LeadStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type CreateLeadInput = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  /**
   * Routing context, already resolved against the real content by
   * submit-lead.ts. This layer stores what it is given; it does not re-check,
   * because the check needs the content module and this file is the database
   * boundary, not the content boundary.
   */
  audience?: string;
  practiceAreaSlug?: string;
  serviceSlug?: string;
  jurisdiction?: string;
};

/**
 * The lead a dashboard action referred to is no longer in the table. Same
 * two-tabs case as ReviewNotFoundError — the list is a snapshot.
 */
export class LeadNotFoundError extends Error {
  constructor(id: string) {
    super(`Lead ${id} not found`);
    this.name = "LeadNotFoundError";
  }
}

function isRecordNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

/**
 * Columns are named one by one, never `data: input`.
 *
 * The schema strips unknown keys and is `.strict()` as well, so nothing
 * unexpected reaches this function today. Both of those are properties of the
 * *caller*, though, and this is the last line before the database. Naming the
 * columns means the set of client-writable fields is decided here, in the
 * write itself, rather than inferred from whatever the schema happens to
 * contain at the time.
 *
 * That distinction is not theoretical. `Lead.status` is a real column: a lead
 * that arrives already HANDLED drops out of the queue and that customer never
 * gets called back. It is absent below because it is not the client's to set —
 * the same reason `id` and `createdAt` are absent.
 *
 * The honeypot is the worked example of the residual risk this closes: a field
 * deliberately *in* the schema that must never be persisted. `.strict()` does
 * nothing about that case; an explicit column list does.
 */
async function createLead(input: CreateLeadInput) {
  return prisma.lead.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      audience: input.audience,
      practiceAreaSlug: input.practiceAreaSlug,
      serviceSlug: input.serviceSlug,
      jurisdiction: input.jurisdiction,
    },
  });
}

export type LeadFilters = {
  status?: LeadStatus;
  name?: string;
  email?: string;
  phone?: string;
  /** Exact match on the stored slug — this comes from a select, not a text box. */
  audience?: string;
  practiceAreaSlug?: string;
};

/**
 * Exported so it can be unit-tested without a database — it is pure, and the
 * combining rules below are the part worth pinning.
 *
 * Every term is AND-ed: typing a name *and* an email means "both", not
 * "either". That is what a person filling in two boxes expects, and the
 * opposite would make each extra term widen the result instead of narrowing
 * it.
 */
export function buildLeadWhere(filters: LeadFilters): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};

  if (filters.status) where.status = filters.status;

  // `contains` + insensitive compiles to ILIKE '%term%'. The leading wildcard
  // means no btree index can serve it — see the migration comment for why a
  // sequential scan is the right trade at this table's size.
  if (filters.name) where.name = { contains: filters.name, mode: "insensitive" };
  if (filters.email) where.email = { contains: filters.email, mode: "insensitive" };
  // Matches the number as it was typed. "(905) 555-0148" will not be found by
  // searching "9055550148" — normalising would need a functional index or a
  // raw query, so the field's hint says so rather than the search quietly
  // missing.
  if (filters.phone) where.phone = { contains: filters.phone, mode: "insensitive" };

  // Equality, not `contains`. These arrive from a <select> populated with the
  // real slugs, so a partial match would only ever be a bug — and equality is
  // the half of [serviceSlug, createdAt] the index can actually serve.
  if (filters.audience) where.audience = filters.audience;
  if (filters.practiceAreaSlug) where.practiceAreaSlug = filters.practiceAreaSlug;

  return where;
}

/** Capped for the same reason as bookings — leads only accumulate. */
const LEADS_PAGE_SIZE = 100;

/**
 * Leads for the dashboard, narrowed by whatever filters are active.
 *
 * Returns two counts, and the distinction matters:
 *   `matching` — how many rows the current filters select.
 *   `total`    — how many leads exist at all.
 *
 * Before filtering existed there was only one count and it meant both. Keeping
 * `total` unfiltered and adding `matching` alongside is what lets the page say
 * "3 of 412 leads match these filters" — with a single number it could only
 * say one or the other, and either reading would be a lie half the time.
 */
async function listAllLeads(filters: LeadFilters = {}, limit: number = LEADS_PAGE_SIZE) {
  const where = buildLeadWhere(filters);

  // id breaks the tie so the order is at least *stable*: createdAt is
  // timestamp(3), and two leads submitted in the same millisecond would
  // otherwise come back in whatever order Postgres feels like, reshuffling
  // between page loads. cuid() is not guaranteed sortable, so this fixes
  // determinism, not chronology.
  const [leads, matching, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      take: limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.lead.count({ where }),
    prisma.lead.count(),
  ]);

  return { leads, matching, total };
}

/**
 * One lead, or null.
 *
 * Exists so the email compose flow can read the recipient's address from the
 * record rather than accepting one from the browser — see
 * features/admin-email/schema/send-email.schema.ts for why there is no `to`
 * field to accept it from.
 */
function getLeadById(id: string) {
  return prisma.lead.findUnique({ where: { id } });
}

async function markHandled(id: string) {
  try {
    return await prisma.lead.update({ where: { id }, data: { status: "HANDLED" } });
  } catch (error) {
    if (isRecordNotFound(error)) throw new LeadNotFoundError(id);
    throw error;
  }
}

export const leadService = {
  createLead,
  getLeadById,
  listAllLeads,
  markHandled,
};
