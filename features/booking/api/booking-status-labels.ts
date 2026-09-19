import type { BookingStatus } from "@/generated/prisma/enums";

/**
 * What a patient is told their booking's state is.
 *
 * A `Record<BookingStatus, string>` rather than a lookup with a fallback, so
 * adding a status is a typecheck failure here instead of a customer reading
 * "Status: REQUESTED" on their account page — which is exactly what the raw
 * enum used to render.
 */
export const PATIENT_STATUS_LABEL: Record<BookingStatus, string> = {
  REQUESTED: "Awaiting confirmation — we'll call you",
  CONFIRMED: "Confirmed",
  PENDING_PAYMENT: "Awaiting payment",
  CANCELLED: "Cancelled",
};

/** The same states, in the words staff use about them. */
export const STAFF_STATUS_LABEL: Record<BookingStatus, string> = {
  REQUESTED: "Request — not yet confirmed",
  CONFIRMED: "Confirmed",
  PENDING_PAYMENT: "Awaiting payment",
  CANCELLED: "Cancelled",
};
