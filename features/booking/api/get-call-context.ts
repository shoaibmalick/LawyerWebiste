"use server";

import { services } from "@/config/content/services";
import { toSentMessage, type SentMessage } from "@/features/admin-email";
import { requireAdmin } from "@/lib/auth-guards";
import { formatDate, formatDateTime } from "@/lib/format";
import { bookingService } from "@/server/services/bookingService";
import { mailMessageService } from "@/server/services/mailMessageService";
import { bookingIdSchema } from "../schema/booking-filters.schema";
import { PATIENT_STATUS_LABEL } from "./booking-status-labels";

export type CallContext = {
  history: { id: string; whenLabel: string; serviceName: string; statusLabel: string }[];
  notes: {
    id: string;
    outcome: string;
    body: string | null;
    whenLabel: string;
    /** ISO, so the panel can merge these with the sent emails in time order. */
    at: string;
    author: string;
  }[];
  /**
   * What has already been emailed to this customer.
   *
   * Returned alongside the call notes rather than folded into them: a
   * BookingNote's `outcome` is a *call* vocabulary that the follow-up view
   * counts and sorts on, so writing email rows into it would silently inflate
   * "we tried to reach this customer". The panel interleaves the two by time.
   */
  messages: SentMessage[];
  openSlots: { id: string; label: string }[];
};

export type CallContextResult = { ok: true; context: CallContext } | { ok: false; error: string };

/**
 * Everything the receptionist needs the moment she opens a booking to make the
 * call: what this patient has had before, what previous calls said, and which
 * times she can move them to.
 *
 * One round trip, fetched when the panel opens rather than for every row on
 * page load — the list runs to a hundred rows and this would be an N+1 across
 * all of them for information nobody has asked to see yet.
 *
 * Everything is preformatted here because lib/format reads the business
 * timezone from config, which has no business in the browser bundle.
 */
export async function getCallContextAction(input: unknown): Promise<CallContextResult> {
  await requireAdmin();

  const parsed = bookingIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That booking reference isn't valid." };
  }

  const booking = await bookingService.getBookingById(parsed.data.bookingId);
  if (!booking) {
    return { ok: false, error: "That booking no longer exists — this list is out of date." };
  }

  const service = services.find((candidate) => candidate.slug === booking.serviceSlug);

  const [history, notes, messages, slots] = await Promise.all([
    bookingService.listBookingsByEmail(booking.customerEmail, {
      excludeId: booking.id,
      limit: 20,
    }),
    bookingService.listBookingNotes(booking.id),
    mailMessageService.listForBooking(booking.id),
    bookingService.listAvailableSlots(),
  ]);

  return {
    ok: true,
    context: {
      history: history.map((past) => ({
        id: past.id,
        whenLabel: formatDate(past.slot.startsAt),
        serviceName:
          services.find((candidate) => candidate.slug === past.serviceSlug)?.name ??
          past.serviceSlug,
        statusLabel: PATIENT_STATUS_LABEL[past.status],
      })),
      notes: notes.map((note) => ({
        id: note.id,
        outcome: note.outcome,
        body: note.body,
        whenLabel: formatDateTime(note.createdAt),
        at: note.createdAt.toISOString(),
        author: note.authorName ?? note.authorEmail ?? "Someone",
      })),
      messages: messages.map(toSentMessage),
      // Only times long enough for what this patient is booked in for — the
      // same duration rule the public calendar applies.
      openSlots: slots
        .filter((slot) => {
          if (!service) return true;
          const minutes = (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000;
          return minutes >= service.durationMinutes;
        })
        .slice(0, 60)
        .map((slot) => ({ id: slot.id, label: formatDateTime(slot.startsAt) })),
    },
  };
}
