-- Indexes for the queries that run on every page load, and for the ones that
-- grow with customer count. Confirmed against EXPLAIN: the approved-reviews
-- query was a sequential scan of the whole Review table, executed on every
-- public page render.

-- listAvailableSlots counts CONFIRMED bookings per slot for every slot it
-- returns; the plain slotId index made that a filter step per row.
DROP INDEX IF EXISTS "Booking_slotId_idx";
CREATE INDEX "Booking_slotId_status_idx" ON "Booking"("slotId", "status");

-- Customer account history.
CREATE INDEX "Booking_customerEmail_idx" ON "Booking"("customerEmail");

-- Public reviews (status = APPROVED) and dashboard moderation (PENDING), both
-- ordered by createdAt.
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");

-- Dashboard leads list: ordered by createdAt, filtered by status.
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
