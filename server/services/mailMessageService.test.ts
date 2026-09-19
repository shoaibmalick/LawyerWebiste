import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mailMessageService } from "./mailMessageService";

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

async function createBooking() {
  const startsAt = hoursFromNow(24);
  const slot = await prisma.availabilitySlot.create({
    data: { startsAt, endsAt: new Date(startsAt.getTime() + 3_600_000), capacity: 1 },
  });
  return prisma.booking.create({
    data: {
      slotId: slot.id,
      serviceSlug: "test-service",
      customerName: "Jane",
      customerEmail: "jane@example.com",
    },
  });
}

function createLead() {
  return prisma.lead.create({
    data: { name: "Sam", email: "sam@example.com", message: "Do you take new customers?" },
  });
}

function baseInput() {
  return {
    toEmail: "jane@example.com",
    subjectLine: "About your appointment",
    body: "Hi Jane,\n\nJust confirming.",
    senderEmail: "admin@business.test",
    senderName: "Reception",
  };
}

describe("mailMessageService", () => {
  beforeEach(async () => {
    await prisma.mailMessage.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.availabilitySlot.deleteMany();
    await prisma.lead.deleteMany();
  });

  afterAll(async () => {
    await prisma.mailMessage.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.availabilitySlot.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.$disconnect();
  });

  it("records a sent message against a booking", async () => {
    const booking = await createBooking();

    const row = await mailMessageService.record({
      ...baseInput(),
      subject: { kind: "booking", bookingId: booking.id },
      status: "SENT",
      provider: "RESEND",
      templateKey: "tried-to-reach-you",
    });

    expect(row.bookingId).toBe(booking.id);
    expect(row.leadId).toBeNull();
    expect(row.status).toBe("SENT");
    expect(row.provider).toBe("RESEND");
    expect(row.templateKey).toBe("tried-to-reach-you");
    expect(row.error).toBeNull();
  });

  it("records a message against a lead", async () => {
    const lead = await createLead();

    const row = await mailMessageService.record({
      ...baseInput(),
      toEmail: lead.email,
      subject: { kind: "lead", leadId: lead.id },
      status: "SENT",
      provider: "SMTP",
    });

    expect(row.leadId).toBe(lead.id);
    expect(row.bookingId).toBeNull();
  });

  it("records a failure with its mapped reason", async () => {
    const booking = await createBooking();

    const row = await mailMessageService.record({
      ...baseInput(),
      subject: { kind: "booking", bookingId: booking.id },
      status: "FAILED",
      provider: "SMTP",
      error: "The mail account rejected our credentials.",
    });

    expect(row.status).toBe("FAILED");
    expect(row.error).toBe("The mail account rejected our credentials.");
  });

  /**
   * SKIPPED is not FAILED. A business that has not filled in the email settings
   * yet has a setup problem, not a delivery problem, and the dashboard says so.
   */
  it("records a skipped message with no provider", async () => {
    const booking = await createBooking();

    const row = await mailMessageService.record({
      ...baseInput(),
      subject: { kind: "booking", bookingId: booking.id },
      status: "SKIPPED",
    });

    expect(row.status).toBe("SKIPPED");
    expect(row.provider).toBeNull();
  });

  it("truncates an over-long error rather than rejecting the row", async () => {
    const booking = await createBooking();

    const row = await mailMessageService.record({
      ...baseInput(),
      subject: { kind: "booking", bookingId: booking.id },
      status: "FAILED",
      error: "x".repeat(500),
    });

    expect(row.error).toHaveLength(200);
  });

  describe("history", () => {
    it("lists a booking's messages newest first", async () => {
      const booking = await createBooking();
      for (const subjectLine of ["First", "Second", "Third"]) {
        await mailMessageService.record({
          ...baseInput(),
          subjectLine,
          subject: { kind: "booking", bookingId: booking.id },
          status: "SENT",
        });
      }

      const messages = await mailMessageService.listForBooking(booking.id);
      expect(messages.map((m) => m.subject)).toEqual(["Third", "Second", "First"]);
    });

    it("does not leak one subject's messages into another's", async () => {
      const booking = await createBooking();
      const lead = await createLead();
      await mailMessageService.record({
        ...baseInput(),
        subject: { kind: "booking", bookingId: booking.id },
        status: "SENT",
      });

      expect(await mailMessageService.listForLead(lead.id)).toHaveLength(0);
      expect(await mailMessageService.listForBooking(booking.id)).toHaveLength(1);
    });
  });

  describe("the exactly-one-subject constraint", () => {
    /**
     * Prisma's types permit both columns being set or neither, so the guarantee
     * is the CHECK in the migration rather than anything TypeScript enforces —
     * which means it has to be exercised through raw SQL to be tested at all.
     */
    it("rejects a row belonging to neither a booking nor a lead", async () => {
      await expect(
        prisma.$executeRaw`
          INSERT INTO "MailMessage" ("id", "toEmail", "subject", "body", "status", "createdAt")
          VALUES ('orphan', 'a@b.test', 's', 'b', 'SENT', NOW())
        `,
      ).rejects.toThrow();
    });

    it("rejects a row belonging to both", async () => {
      const booking = await createBooking();
      const lead = await createLead();

      await expect(
        prisma.$executeRaw`
          INSERT INTO "MailMessage" ("id", "bookingId", "leadId", "toEmail", "subject", "body", "status", "createdAt")
          VALUES ('both', ${booking.id}, ${lead.id}, 'a@b.test', 's', 'b', 'SENT', NOW())
        `,
      ).rejects.toThrow();
    });
  });

  describe("cascade", () => {
    /**
     * Load-bearing, not tidy. deleteSlot removes CANCELLED bookings along with
     * the slot, and a message row holding that key would block the delete at
     * the database. It is also the retention mechanism: these rows hold a
     * customer's address and the text of a message about their treatment, and
     * must not outlive the record they belong to.
     */
    it("deletes a booking's messages with the booking", async () => {
      const booking = await createBooking();
      await mailMessageService.record({
        ...baseInput(),
        subject: { kind: "booking", bookingId: booking.id },
        status: "SENT",
      });

      await prisma.booking.delete({ where: { id: booking.id } });

      expect(await prisma.mailMessage.count()).toBe(0);
    });

    it("deletes a lead's messages with the lead", async () => {
      const lead = await createLead();
      await mailMessageService.record({
        ...baseInput(),
        subject: { kind: "lead", leadId: lead.id },
        status: "SENT",
      });

      await prisma.lead.delete({ where: { id: lead.id } });

      expect(await prisma.mailMessage.count()).toBe(0);
    });
  });
});
