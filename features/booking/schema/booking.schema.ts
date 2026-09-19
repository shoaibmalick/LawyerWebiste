import { z } from "zod";
import { honeypotField } from "@/lib/honeypot";
import { optionalPhoneSchema } from "@/lib/phone";

/**
 * What the /api/booking boundary accepts. Unchanged by the calendar work:
 * picking a service and a day is only a way of arriving at a slot id, so the
 * server contract stays "a slot, and who is taking it".
 */
export const createBookingSchema = z
  .object({
    slotId: z.string().min(1),
    // Which service the customer is coming in for. A slot is a unit of the
    // business's time, so the service is the customer's choice at booking rather
    // than a property of the slot. Validated against config/content/services.ts
    // in submit-booking, which also checks the service fits the slot's length.
    serviceSlug: z.string().min(1),
    customerName: z.string().min(1).max(200),
    // Lower-cased here, at the one boundary every booking passes through, so a
    // patient's history matches across "Jane@x.com" and "jane@x.com". They were
    // two different people before this. Normalising on write rather than at the
    // query keeps Booking_customerEmail_idx usable — a case-insensitive match
    // compiles to ILIKE equality, which no btree can serve.
    customerEmail: z.email().transform((value) => value.trim().toLowerCase()),
    // One format everywhere the public types a number — see lib/phone.ts.
    customerPhone: optionalPhoneSchema,
    // Invisible spam trap — accepted, never stored. See lib/honeypot.ts.
    ...honeypotField,
  })
  .strict();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * The sentinel for "my treatment isn't listed".
 *
 * Prefixed so it can never collide with a real service slug from
 * config/content/services.ts, which are all plain kebab-case.
 */
export const OTHER_SERVICE_VALUE = "__other__";

/**
 * What the booking form itself validates.
 *
 * Deliberately separate from createBookingSchema. The form has two outcomes —
 * a real booking against a slot, or an enquiry for something we publish no
 * availability for — and only the first is a Booking. Modelling both here
 * keeps that branch in one place rather than spread across the component.
 */
export const bookingFormSchema = z
  .object({
    serviceSlug: z.string().min(1, "Choose what you're coming in for"),
    /** Set for a real booking; empty when serviceSlug is the Other sentinel. */
    slotId: z.string().optional(),
    /** Set for an enquiry; describes what they actually need. */
    enquiryDetails: z.string().max(2000).optional(),
    /** Optional free text for an enquiry, e.g. "weekday mornings". */
    preferredTiming: z.string().max(200).optional(),
    customerName: z.string().min(1, "Your name, please").max(200),
    customerEmail: z.email("A valid email, so we can confirm"),
    // One format everywhere the public types a number — see lib/phone.ts.
    customerPhone: optionalPhoneSchema,
    // Invisible spam trap — accepted, never stored. See lib/honeypot.ts.
    ...honeypotField,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.serviceSlug === OTHER_SERVICE_VALUE) {
      if (!value.enquiryDetails?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["enquiryDetails"],
          message: "Tell us briefly what you need and we'll call you back",
        });
      }
      return;
    }

    if (!value.slotId) {
      ctx.addIssue({
        code: "custom",
        path: ["slotId"],
        message: "Pick a day and a time",
      });
    }
  });

export type BookingFormInput = z.infer<typeof bookingFormSchema>;
