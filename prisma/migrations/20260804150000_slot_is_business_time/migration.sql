-- A slot is a unit of the business's time, not of a service.
--
-- Before this, AvailabilitySlot carried a serviceSlug, so one 9am opening
-- existed once per service and capacity was counted per row. A single-chair
-- practice offering nine services published nine independent 9am slots and
-- could be booked nine times over for the same moment. Which service a
-- customer wants moves onto Booking, where it always belonged.
--
-- Written by hand rather than generated: `prisma migrate dev` refuses to run
-- non-interactively once it has any warning to show, and the unique index
-- added at the end is exactly such a warning.

-- 1. Booking learns which service it is for, backfilled from its slot.
ALTER TABLE "Booking" ADD COLUMN "serviceSlug" TEXT;

UPDATE "Booking" b
SET "serviceSlug" = s."serviceSlug"
FROM "AvailabilitySlot" s
WHERE s."id" = b."slotId";

-- slotId is a required FK, so every row is now populated.
ALTER TABLE "Booking" ALTER COLUMN "serviceSlug" SET NOT NULL;

-- 2. Collapse the per-service duplicates into one slot per start time.
--
-- The survivor at each instant is the lowest id, and it takes the longest
-- endsAt found there — services had different durations, so keeping the
-- longest reserves the most chair time rather than the least. Bookings are
-- repointed at the survivor before the others are removed, so no appointment
-- loses its slot.
CREATE TEMPORARY TABLE "_slot_keeper" AS
SELECT DISTINCT ON ("startsAt") "startsAt", "id" AS "keepId"
FROM "AvailabilitySlot"
ORDER BY "startsAt", "id";

UPDATE "AvailabilitySlot" s
SET "endsAt" = longest."maxEndsAt"
FROM (
  SELECT "startsAt", MAX("endsAt") AS "maxEndsAt"
  FROM "AvailabilitySlot"
  GROUP BY "startsAt"
) AS longest
WHERE s."startsAt" = longest."startsAt";

UPDATE "Booking" b
SET "slotId" = k."keepId"
FROM "AvailabilitySlot" s, "_slot_keeper" k
WHERE b."slotId" = s."id"
  AND s."startsAt" = k."startsAt"
  AND s."id" <> k."keepId";

DELETE FROM "AvailabilitySlot" s
USING "_slot_keeper" k
WHERE s."startsAt" = k."startsAt"
  AND s."id" <> k."keepId";

DROP TABLE "_slot_keeper";

-- 3. The column that caused it.
DROP INDEX IF EXISTS "AvailabilitySlot_serviceSlug_startsAt_idx";
ALTER TABLE "AvailabilitySlot" DROP COLUMN "serviceSlug";

-- 4. One slot per instant, enforced by the database rather than by convention.
-- Running two chairs is `capacity = 2` on the single row, never a second row.
CREATE UNIQUE INDEX "AvailabilitySlot_startsAt_key" ON "AvailabilitySlot"("startsAt");
CREATE INDEX "AvailabilitySlot_startsAt_idx" ON "AvailabilitySlot"("startsAt");
CREATE INDEX "Booking_serviceSlug_idx" ON "Booking"("serviceSlug");
