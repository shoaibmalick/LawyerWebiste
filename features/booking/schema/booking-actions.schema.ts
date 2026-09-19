import { z } from "zod";
import { BookingNoteOutcome } from "@/generated/prisma/enums";

/**
 * A note the receptionist may attach to whatever she just did.
 *
 * Optional on every action on purpose: confirming and recording the call are
 * separate decisions made in the same breath, so she types once and the action
 * writes both. A note never *triggers* a status change — auto-confirming on
 * "spoke to patient" would confirm bookings the patient had just declined.
 */
export const bookingNoteInputSchema = z
  .object({
    outcome: z.enum(BookingNoteOutcome),
    body: z.string().trim().max(2000).optional(),
  })
  .strict();

export const confirmBookingSchema = z
  .object({
    bookingId: z.string().min(1),
    note: bookingNoteInputSchema.optional(),
  })
  .strict();

export const cancelBookingSchema = confirmBookingSchema;

export const addBookingNoteSchema = z
  .object({
    bookingId: z.string().min(1),
    note: bookingNoteInputSchema,
  })
  .strict();

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const rescheduleBookingSchema = z
  .object({
    bookingId: z.string().min(1),
    /** Explicit — the UI has two buttons and each says which it is. */
    confirm: z.boolean(),
    note: bookingNoteInputSchema.optional(),
    target: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("slot"), slotId: z.string().min(1) }).strict(),
      z
        .object({
          kind: z.literal("override"),
          // Wall-clock at the practice, converted server-side. Never a Date from
          // the browser — that would be the visitor's timezone, not the
          // practice's, and would land the appointment hours away.
          date: z.string().regex(DATE, "Use YYYY-MM-DD"),
          time: z.string().regex(TIME, "Use HH:MM"),
        })
        .strict(),
    ]),
  })
  .strict();

export const followUpWindowSchema = z
  .object({
    // One day is a same-week glance; sixty is further than anyone plans by
    // phone. Bounded so a typo can't ask for every booking ever made.
    days: z.number().int().min(1).max(60),
  })
  .strict();

export type BookingNoteInput = z.infer<typeof bookingNoteInputSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
