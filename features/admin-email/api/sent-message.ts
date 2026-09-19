import { formatDateTime } from "@/lib/format";

/**
 * The view-model for one logged message, and the mapper that builds it.
 *
 * In its own module rather than beside `getComposeContextAction`, because that
 * file is `"use server"` and such a file may only export async functions — a
 * plain helper exported from one fails the build outright. It is imported by
 * two features (the compose panel and the booking call panel), so it needs to
 * be exported from somewhere.
 */
export type SentMessage = {
  id: string;
  subject: string;
  body: string;
  whenLabel: string;
  /**
   * ISO timestamp, alongside the formatted label rather than instead of it.
   * The booking call panel merges these with call notes into one history, and
   * a display string like "Aug 16, 2:14 PM" cannot be sorted.
   */
  at: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  statusLabel: string;
  error: string | null;
  sender: string;
};

const STATUS_LABEL: Record<SentMessage["status"], string> = {
  SENT: "Sent",
  FAILED: "Failed",
  SKIPPED: "Not sent — email wasn't set up",
};

/**
 * Preformatted on the server because `lib/format` reads the business timezone
 * from config, which has no business in the browser bundle — the same rule the
 * call panel follows.
 */
export function toSentMessage(message: {
  id: string;
  subject: string;
  body: string;
  createdAt: Date;
  status: "SENT" | "FAILED" | "SKIPPED";
  error: string | null;
  senderName: string | null;
  senderEmail: string | null;
}): SentMessage {
  return {
    id: message.id,
    subject: message.subject,
    body: message.body,
    whenLabel: formatDateTime(message.createdAt),
    at: message.createdAt.toISOString(),
    status: message.status,
    statusLabel: STATUS_LABEL[message.status],
    error: message.error,
    sender: message.senderName ?? message.senderEmail ?? "Someone",
  };
}
