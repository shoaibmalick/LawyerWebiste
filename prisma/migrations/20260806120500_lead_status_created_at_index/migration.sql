-- The leads dashboard now filters by status while still ordering by createdAt.
--
-- With the two single-column indexes, Postgres had to pick one and then either
-- sort the result or filter it. The composite serves the whole query as an
-- index scan with no sort. It is the same shape Review already carries
-- (Review_status_createdAt_idx, added in 20260805010000_add_scale_indexes).
--
-- The standalone status index becomes redundant — [status, createdAt] covers
-- it as a prefix — so it is dropped, exactly as that earlier migration dropped
-- Booking_slotId_idx for the same reason.
--
-- Deliberately no index for the name/email/phone search. Those compile to
-- `ILIKE '%term%'`, and a leading wildcard cannot use a btree index at all.
-- Only a pg_trgm GIN index would help, which means installing a Postgres
-- extension in the dev database, the test database, CI's service container and
-- every client's Supabase project — four places to keep in step, to save
-- microseconds on a table that reaches a few thousand rows in five years.
-- Revisit if a client's Lead table ever passes ~100k rows.

-- DropIndex
DROP INDEX IF EXISTS "Lead_status_idx";

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
