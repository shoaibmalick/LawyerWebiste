import type { MailMessage } from "@/generated/prisma/client";
import type { EmailProvider, MailStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * The record of what the dashboard has emailed a customer or an enquirer.
 *
 * Written after the attempt, never before — see sendAdminEmailAction. A row
 * that claims SENT for a message that never left is worse than no row at all,
 * because the front desk reads this to decide whether to contact someone again.
 */

/** Exactly one subject, mirroring the CHECK constraint on the table. */
export type MailSubject = { kind: "booking"; bookingId: string } | { kind: "lead"; leadId: string };

export type RecordMailInput = {
  subject: MailSubject;
  toEmail: string;
  subjectLine: string;
  body: string;
  templateKey?: string;
  status: MailStatus;
  provider?: EmailProvider;
  /** Already mapped and truncated by the caller — never a raw provider message. */
  error?: string;
  senderEmail: string | null;
  senderName: string | null;
};

/** Bound in the database too; this is the friendlier half of the same limit. */
const ERROR_MAX = 200;

async function record(input: RecordMailInput): Promise<MailMessage> {
  return prisma.mailMessage.create({
    data: {
      bookingId: input.subject.kind === "booking" ? input.subject.bookingId : null,
      leadId: input.subject.kind === "lead" ? input.subject.leadId : null,
      toEmail: input.toEmail,
      subject: input.subjectLine,
      body: input.body,
      templateKey: input.templateKey ?? null,
      status: input.status,
      provider: input.provider ?? null,
      error: input.error ? input.error.slice(0, ERROR_MAX) : null,
      senderEmail: input.senderEmail,
      senderName: input.senderName,
    },
  });
}

/**
 * Capped rather than unbounded, like every other dashboard read. Newest first
 * with id as a tiebreak, so two messages written in the same millisecond keep a
 * stable order instead of swapping places between refreshes.
 */
const HISTORY_LIMIT = 50;

async function listForBooking(bookingId: string): Promise<MailMessage[]> {
  return prisma.mailMessage.findMany({
    where: { bookingId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: HISTORY_LIMIT,
  });
}

async function listForLead(leadId: string): Promise<MailMessage[]> {
  return prisma.mailMessage.findMany({
    where: { leadId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: HISTORY_LIMIT,
  });
}

export const mailMessageService = {
  record,
  listForBooking,
  listForLead,
};
