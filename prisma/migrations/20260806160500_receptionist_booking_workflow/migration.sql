-- Everything the receptionist workflow needs that could not share a
-- transaction with the ALTER TYPE in the migration immediately before this one.

-- A booking written without an explicit status is a request, not a confirmed
-- appointment. The safe direction: holding a chair we did not need to hold is
-- undone in one click; selling the same chair twice is not.
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

-- Patient history is matched by email, and "Jane@x.com" and "jane@x.com" were
-- two different people. Normalised on write from now on (createBookingSchema);
-- this folds what is already stored, so the existing Booking_customerEmail_idx
-- serves an equality match rather than callers needing an ILIKE no btree can
-- use.
UPDATE "Booking" SET "customerEmail" = lower("customerEmail")
WHERE "customerEmail" <> lower("customerEmail");

-- Slots conjured by the reschedule override, so they can be unmade when
-- vacated instead of becoming publicly bookable openings nobody offered.
ALTER TABLE "AvailabilitySlot" ADD COLUMN "createdByOverride" BOOLEAN NOT NULL DEFAULT false;

-- How far ahead the follow-up view looks. Owner-editable at /dashboard/settings.
ALTER TABLE "SiteSettings" ADD COLUMN "followUpDays" INTEGER NOT NULL DEFAULT 5;

-- CreateEnum
CREATE TYPE "BookingNoteOutcome" AS ENUM ('SPOKE_TO_PATIENT', 'NO_ANSWER', 'LEFT_MESSAGE', 'NOTE');

-- CreateTable
CREATE TABLE "BookingNote" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "outcome" "BookingNoteOutcome" NOT NULL DEFAULT 'NOTE',
    "body" TEXT,
    "authorEmail" TEXT,
    "authorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingNote_bookingId_createdAt_idx" ON "BookingNote"("bookingId", "createdAt");

-- AddForeignKey
-- Cascade, because deleteSlot removes CANCELLED bookings along with the slot
-- and a note holding this key would block that delete.
ALTER TABLE "BookingNote" ADD CONSTRAINT "BookingNote_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
