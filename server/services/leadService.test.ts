import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildLeadWhere, LeadNotFoundError, leadService } from "./leadService";

const lead = (
  over: Partial<{ name: string; email: string; phone: string; message: string }> = {},
) =>
  leadService.createLead({
    name: "Jane Doe",
    email: "jane@example.com",
    message: "Do you take walk-ins?",
    ...over,
  });

describe("leadService", () => {
  beforeEach(async () => {
    await prisma.lead.deleteMany();
  });

  afterAll(async () => {
    await prisma.lead.deleteMany();
    await prisma.$disconnect();
  });

  it("creates a lead with NEW status by default", async () => {
    const lead = await leadService.createLead({
      name: "Jane",
      email: "jane@example.com",
      message: "Do you take walk-ins?",
    });
    expect(lead.status).toBe("NEW");
  });

  it("lists leads newest first", async () => {
    await leadService.createLead({ name: "First", email: "a@example.com", message: "m1" });
    // createdAt is timestamp(3). Without a gap these two can share a
    // millisecond, the ordering is a tie, and this assertion fails at random —
    // which it did, roughly one run in eight, for a long time before anyone
    // caught which test it was.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await leadService.createLead({ name: "Second", email: "b@example.com", message: "m2" });

    const { leads, total } = await leadService.listAllLeads();
    expect(total).toBe(2);
    expect(leads).toHaveLength(2);
    expect(leads[0].name).toBe("Second");
    expect(leads[1].name).toBe("First");
  });

  it("marks a lead as handled", async () => {
    const created = await lead();

    expect((await leadService.markHandled(created.id)).status).toBe("HANDLED");
  });

  it("throws LeadNotFoundError for a lead that is already gone", async () => {
    await expect(leadService.markHandled("does-not-exist")).rejects.toBeInstanceOf(
      LeadNotFoundError,
    );
  });

  describe("filtering", () => {
    /**
     * The count regression this guards.
     *
     * `total` used to be the only number and meant "every row". Once filtering
     * existed, reusing it as "how many matched" would have made the page read
     * "Showing 1 of 3" for a filter that matched exactly one — and worse, the
     * old copy only rendered when total exceeded the page size, so a filter
     * matching 1 of 3 would have printed nothing at all and the admin could
     * not tell whether it had done anything.
     */
    it("counts only the matches when filtering, and the whole table separately", async () => {
      await lead({ name: "One" });
      await lead({ name: "Two" });
      const handled = await lead({ name: "Three" });
      await leadService.markHandled(handled.id);

      const { leads, matching, total } = await leadService.listAllLeads({ status: "HANDLED" });

      expect(leads).toHaveLength(1);
      expect(matching).toBe(1);
      expect(total).toBe(3);
    });

    it("matches a substring of the name, email or phone, ignoring case", async () => {
      await lead({ name: "Priya Nair", email: "priya@clinic.test", phone: "905-555-0148" });
      await lead({ name: "Marcus Webb", email: "marcus@other.test", phone: "416-555-0199" });

      for (const [label, filters] of [
        ["name", { name: "PRIY" }],
        ["email", { email: "CLINIC" }],
        ["phone", { phone: "0148" }],
      ] as const) {
        const { leads, matching } = await leadService.listAllLeads(filters);
        expect(
          leads.map((l) => l.name),
          label,
        ).toEqual(["Priya Nair"]);
        expect(matching, label).toBe(1);
      }
    });

    it("combines filters with AND, not OR", async () => {
      // Two terms should narrow the result. If they were OR-ed, adding a
      // second box would widen it — the opposite of what filling in two
      // fields means to the person doing it.
      await lead({ name: "Priya Nair", email: "priya@clinic.test" });
      await lead({ name: "Marcus Webb", email: "marcus@clinic.test" });

      const both = await leadService.listAllLeads({ name: "Priya", email: "clinic" });
      expect(both.matching).toBe(1);

      const mismatched = await leadService.listAllLeads({ name: "Priya", email: "other" });
      expect(mismatched.matching).toBe(0);
    });

    it("treats an absent filter as no filter", async () => {
      await lead();
      await lead({ name: "Someone else" });

      expect((await leadService.listAllLeads({})).matching).toBe(2);
      expect((await leadService.listAllLeads()).matching).toBe(2);
    });

    it("leaves a lead with no phone out of a phone search rather than throwing", async () => {
      // phone is nullable — most contact-form submissions omit it.
      await lead({ name: "No phone" });
      await lead({ name: "Has phone", phone: "905-555-0148" });

      const { leads } = await leadService.listAllLeads({ phone: "555" });

      expect(leads.map((l) => l.name)).toEqual(["Has phone"]);
    });

    /**
     * The property that makes this filter worth having: it runs in the query,
     * not over the rows that happen to have been fetched.
     *
     * The list is capped, so a client-side filter would only ever search the
     * most recent page of leads and would silently fail to find an older one —
     * the admin would search a customer's email, see nothing, and conclude the
     * lead was never received. Passing limit: 1 makes the cap smaller than the
     * table and asks for the row the cap would have excluded.
     */
    it("finds a lead older than the page cap", async () => {
      await lead({ name: "Ancient enquiry", email: "ancient@example.test" });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await lead({ name: "Recent enquiry", email: "recent@example.test" });

      // Unfiltered, the cap hides the old one entirely.
      const capped = await leadService.listAllLeads({}, 1);
      expect(capped.leads.map((l) => l.name)).toEqual(["Recent enquiry"]);

      // Filtered, it is found anyway — because the filter reached the database.
      const found = await leadService.listAllLeads({ name: "Ancient" }, 1);
      expect(found.leads.map((l) => l.name)).toEqual(["Ancient enquiry"]);
      expect(found.matching).toBe(1);
      expect(found.total).toBe(2);
    });

    it("still orders and caps a filtered result", async () => {
      await lead({ name: "Older match" });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await lead({ name: "Newer match" });

      const { leads } = await leadService.listAllLeads({ name: "match" });

      expect(leads.map((l) => l.name)).toEqual(["Newer match", "Older match"]);
    });
  });

  describe("buildLeadWhere", () => {
    // Pure, so it needs no database — worth pinning separately because the
    // insensitive mode is easy to drop in a refactor and the loss would be
    // silent (searches would just quietly stop matching).
    it("omits every clause when nothing is filtered", () => {
      expect(buildLeadWhere({})).toEqual({});
    });

    it("asks Postgres for a case-insensitive substring match", () => {
      expect(buildLeadWhere({ name: "priya" })).toEqual({
        name: { contains: "priya", mode: "insensitive" },
      });
    });

    it("passes the status through as an exact match", () => {
      expect(buildLeadWhere({ status: "HANDLED" })).toEqual({ status: "HANDLED" });
    });
  });
});
