"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FIELD } from "@/components/ui/field";
import { ComposePanel } from "@/features/admin-email";
import type { BookingNoteOutcome, BookingStatus } from "@/generated/prisma/enums";
import { addBookingNoteAction } from "../api/add-booking-note";
import { STAFF_STATUS_LABEL } from "../api/booking-status-labels";
import { cancelBookingAction } from "../api/cancel-booking";
import { confirmBookingAction, type BookingActionResult } from "../api/confirm-booking";
import { getCallContextAction, type CallContext } from "../api/get-call-context";
import { markBookingPaidAction } from "../api/mark-paid";
import { rescheduleBookingAction } from "../api/reschedule-booking";

/**
 * Narrow view-model — see ReviewModerationList for why the label is formatted
 * on the server. `serviceName` and `tracksPayment` are resolved there too,
 * from config/content/services.ts, which has no business in the browser
 * bundle.
 */
export type BookingRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  serviceName: string;
  startsAtLabel: string;
  // The Prisma enum rather than a hand-written union, so adding a status is a
  // compile error here instead of a row that renders with no actions at all.
  status: BookingStatus;
  paid: boolean;
  tracksPayment: boolean;
};

const OUTCOMES: { value: BookingNoteOutcome; label: string }[] = [
  { value: "SPOKE_TO_PATIENT", label: "Spoke to customer" },
  { value: "NO_ANSWER", label: "No answer" },
  { value: "LEFT_MESSAGE", label: "Left a message" },
  { value: "NOTE", label: "Note" },
];

export function BookingList({
  bookings,
  emptyMessage,
}: {
  bookings: BookingRow[];
  emptyMessage: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BookingActionResult | null>(null);
  const [acting, setActing] = useState<{ id: string; verb: string } | null>(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);

  // Call-panel state. Every one of these is row-scoped and must be cleared
  // when the list refreshes — see the transition below.
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);
  const [composingId, setComposingId] = useState<string | null>(null);
  const [context, setContext] = useState<CallContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<BookingNoteOutcome>("SPOKE_TO_PATIENT");
  const [noteBody, setNoteBody] = useState("");
  const [targetSlotId, setTargetSlotId] = useState("");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideTime, setOverrideTime] = useState("");

  function resetPanel() {
    setOpenPanelId(null);
    setComposingId(null);
    setContext(null);
    setContextError(null);
    setNoteBody("");
    setTargetSlotId("");
    setOverrideDate("");
    setOverrideTime("");
    setOutcome("SPOKE_TO_PATIENT");
  }

  function run(id: string, verb: string, action: () => Promise<BookingActionResult>) {
    setResult(null);
    setActing({ id, verb });

    startTransition(async () => {
      setResult(await action());
      router.refresh();
      // All of it, together. router.refresh() re-renders the server component
      // but this client instance survives — a confirm left armed, or a call
      // panel left open, points at a different customer once the rows reorder.
      setActing(null);
      setConfirmingCancelId(null);
      resetPanel();
    });
  }

  /** Whatever is typed in the note fields, passed along with any action. */
  function notePayload() {
    return noteBody.trim() ? { outcome, body: noteBody.trim() } : undefined;
  }

  function toggleCompose(bookingId: string) {
    setComposingId((open) => (open === bookingId ? null : bookingId));
  }

  function togglePanel(bookingId: string) {
    if (openPanelId === bookingId) {
      resetPanel();
      return;
    }
    resetPanel();
    setOpenPanelId(bookingId);
    startTransition(async () => {
      const outcomeResult = await getCallContextAction({ bookingId });
      if (outcomeResult.ok) {
        setContext(outcomeResult.context);
      } else {
        setContextError(outcomeResult.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="sr-only">
        {result ? (result.ok ? result.message : result.error) : ""}
      </p>
      {result && (
        // aria-hidden because the live region above already announces this
        // text; without it a screen reader reads the same message twice.
        <p
          aria-hidden="true"
          className={result.ok ? "text-foreground text-sm" : "text-destructive text-sm"}
        >
          {result.ok ? result.message : result.error}
        </p>
      )}

      {bookings.length === 0 && <p className="text-muted-foreground text-sm">{emptyMessage}</p>}

      {bookings.map((booking) => {
        const busy = acting?.id === booking.id;
        const label = (idle: string, verb: string) => (busy && acting?.verb === verb ? verb : idle);
        const panelOpen = openPanelId === booking.id;
        const composing = composingId === booking.id;

        return (
          <div
            key={booking.id}
            className="border-border flex flex-col gap-3 rounded-lg border p-4 text-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-foreground font-medium">
                  {booking.customerName} — {booking.serviceName}
                </p>
                <p className="text-muted-foreground">
                  {booking.startsAtLabel} · {booking.customerEmail}
                  {booking.customerPhone ? ` · ${booking.customerPhone}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {STAFF_STATUS_LABEL[booking.status]}
                  {booking.tracksPayment ? ` · ${booking.paid ? "Paid" : "Not paid yet"}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {confirmingCancelId === booking.id ? (
                  <>
                    {/* Confirm sits to the right of where Cancel was, so a
                        double-click cannot carry through to it. */}
                    <span className="text-muted-foreground">Cancel this appointment?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setConfirmingCancelId(null)}
                    >
                      Keep it
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(booking.id, "Cancelling…", () =>
                          cancelBookingAction({ bookingId: booking.id, note: notePayload() }),
                        )
                      }
                    >
                      {label("Yes, cancel", "Cancelling…")}
                    </Button>
                  </>
                ) : (
                  <>
                    {booking.status === "REQUESTED" && (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(booking.id, "Confirming…", () =>
                            confirmBookingAction({ bookingId: booking.id, note: notePayload() }),
                          )
                        }
                      >
                        {label("Confirm", "Confirming…")}
                      </Button>
                    )}
                    {booking.status !== "CANCELLED" && (
                      <Button variant="ghost" size="sm" onClick={() => togglePanel(booking.id)}>
                        {panelOpen ? "Close" : "Call panel"}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => toggleCompose(booking.id)}>
                      {composing ? "Close email" : "Email"}
                    </Button>
                    {booking.tracksPayment && !booking.paid && booking.status !== "CANCELLED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(booking.id, "Marking…", () =>
                            markBookingPaidAction({ bookingId: booking.id }),
                          )
                        }
                      >
                        {label("Mark paid", "Marking…")}
                      </Button>
                    )}
                    {booking.status !== "CANCELLED" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() => setConfirmingCancelId(booking.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {panelOpen && (
              <div className="border-border flex flex-col gap-5 rounded-md border border-dashed p-4">
                {contextError && <p className="text-destructive text-sm">{contextError}</p>}
                {!context && !contextError && (
                  <p className="text-muted-foreground text-sm">Loading…</p>
                )}

                {context && (
                  <>
                    <section className="flex flex-col gap-2">
                      <h3 className="text-foreground font-medium">Earlier visits</h3>
                      {context.history.length === 0 ? (
                        <p className="text-muted-foreground">First time with us.</p>
                      ) : (
                        <ul className="text-muted-foreground flex flex-col gap-1">
                          {context.history.map((past) => (
                            <li key={past.id}>
                              {past.whenLabel} · {past.serviceName} · {past.statusLabel}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="flex flex-col gap-2">
                      <h3 className="text-foreground font-medium">Calls and emails</h3>
                      {(() => {
                        // Calls and emails in one list, newest first. They are
                        // separate records deliberately — a BookingNote's
                        // outcome is a call vocabulary the follow-up view
                        // counts on — but "have we been in touch, and what did
                        // we say" is one question, and answering it from two
                        // lists means reading both and doing the merge by eye.
                        const entries = [
                          ...context.notes.map((note) => ({
                            key: `note-${note.id}`,
                            at: note.at,
                            whenLabel: note.whenLabel,
                            author: note.author,
                            what:
                              OUTCOMES.find((o) => o.value === note.outcome)?.label ?? note.outcome,
                            detail: note.body,
                          })),
                          ...context.messages.map((message) => ({
                            key: `mail-${message.id}`,
                            at: message.at,
                            whenLabel: message.whenLabel,
                            author: message.sender,
                            what: `Email · ${message.statusLabel}`,
                            detail: message.error
                              ? `${message.subject} — ${message.error}`
                              : message.subject,
                          })),
                        ].sort((a, b) => b.at.localeCompare(a.at));

                        if (entries.length === 0) {
                          return <p className="text-muted-foreground">Nothing recorded yet.</p>;
                        }

                        return (
                          <ul className="text-muted-foreground flex flex-col gap-1">
                            {entries.map((entry) => (
                              <li key={entry.key}>
                                {entry.whenLabel} · {entry.author} · {entry.what}
                                {entry.detail ? ` — ${entry.detail}` : ""}
                              </li>
                            ))}
                          </ul>
                        );
                      })()}

                      {/* Above the buttons on purpose: whatever is typed here
                          rides along with Confirm, Cancel or a move, so the
                          staff member types once. */}
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-foreground font-medium">How did the call go?</span>
                          <select
                            value={outcome}
                            onChange={(event) =>
                              setOutcome(event.target.value as BookingNoteOutcome)
                            }
                            className={FIELD}
                          >
                            {OUTCOMES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex min-w-60 flex-1 flex-col gap-1">
                          <span className="text-foreground font-medium">Note</span>
                          <input
                            value={noteBody}
                            onChange={(event) => setNoteBody(event.target.value)}
                            placeholder="Asked to come after 4pm"
                            className={FIELD}
                          />
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending || !noteBody.trim()}
                          onClick={() =>
                            run(booking.id, "Saving…", () =>
                              addBookingNoteAction({
                                bookingId: booking.id,
                                note: { outcome, body: noteBody.trim() },
                              }),
                            )
                          }
                        >
                          {label("Save note only", "Saving…")}
                        </Button>
                      </div>
                    </section>

                    <section className="flex flex-col gap-3">
                      <h3 className="text-foreground font-medium">Move this appointment</h3>
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-foreground font-medium">New time</span>
                          <select
                            value={targetSlotId}
                            onChange={(event) => setTargetSlotId(event.target.value)}
                            className={FIELD}
                          >
                            <option value="">Choose a free time…</option>
                            {context.openSlots.map((slot) => (
                              <option key={slot.id} value={slot.id}>
                                {slot.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button
                          size="sm"
                          disabled={pending || !targetSlotId}
                          onClick={() =>
                            run(booking.id, "Moving…", () =>
                              rescheduleBookingAction({
                                bookingId: booking.id,
                                confirm: true,
                                note: notePayload(),
                                target: { kind: "slot", slotId: targetSlotId },
                              }),
                            )
                          }
                        >
                          {label("Move & confirm", "Moving…")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending || !targetSlotId}
                          onClick={() =>
                            run(booking.id, "Moving…", () =>
                              rescheduleBookingAction({
                                bookingId: booking.id,
                                confirm: false,
                                note: notePayload(),
                                target: { kind: "slot", slotId: targetSlotId },
                              }),
                            )
                          }
                        >
                          Move only
                        </Button>
                      </div>

                      <details className="text-muted-foreground">
                        <summary className="cursor-pointer">
                          Need a time we don&apos;t normally offer?
                        </summary>
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                          <label className="flex flex-col gap-1">
                            <span className="text-foreground font-medium">Date</span>
                            <input
                              type="date"
                              value={overrideDate}
                              onChange={(event) => setOverrideDate(event.target.value)}
                              className={FIELD}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-foreground font-medium">Time</span>
                            <input
                              type="time"
                              value={overrideTime}
                              onChange={(event) => setOverrideTime(event.target.value)}
                              className={FIELD}
                            />
                          </label>
                          <Button
                            size="sm"
                            disabled={pending || !overrideDate || !overrideTime}
                            onClick={() =>
                              run(booking.id, "Moving…", () =>
                                rescheduleBookingAction({
                                  bookingId: booking.id,
                                  confirm: true,
                                  note: notePayload(),
                                  target: {
                                    kind: "override",
                                    date: overrideDate,
                                    time: overrideTime,
                                  },
                                }),
                              )
                            }
                          >
                            {label("Move & confirm", "Moving…")}
                          </Button>
                          <p className="basis-full">
                            This books the slot at that time even though it is outside your usual
                            availability. It disappears again if the appointment moves or is
                            cancelled.
                          </p>
                        </div>
                      </details>
                    </section>
                  </>
                )}
              </div>
            )}

            {composing && (
              <div className="border-border rounded-md border border-dashed p-4">
                <BookingComposePanel
                  bookingId={booking.id}
                  onSent={(outcome) => {
                    setResult(outcome);
                    setComposingId(null);
                    router.refresh();
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Exists purely to give ComposePanel a stable `subject` prop.
 *
 * Building `{ kind: "booking", bookingId }` inline in the map would be a new
 * object on every render of the list, and the panel refetches its context when
 * that changes — which, inside a component that re-renders on every keystroke
 * in the note field, is a request loop.
 */
function BookingComposePanel({
  bookingId,
  onSent,
}: {
  bookingId: string;
  onSent: (result: BookingActionResult) => void;
}) {
  const subject = useMemo(() => ({ kind: "booking" as const, bookingId }), [bookingId]);

  return <ComposePanel subject={subject} onSent={onSent} />;
}
