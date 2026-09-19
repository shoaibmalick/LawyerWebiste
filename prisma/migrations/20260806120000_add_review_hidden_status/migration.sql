-- Rejecting a review stops deleting it and hides it instead, reversibly.
--
-- Hand-written rather than generated: `prisma migrate dev` refuses to run
-- non-interactively whenever it has any warning to show, and adding an enum
-- value is one of those cases (see CLAUDE.md's Prisma 7 note). Apply with
-- `prisma migrate deploy`.
--
-- Safe on a database with rows: this only widens the type. No row changes
-- value, no table is rewritten, and no ACCESS EXCLUSIVE lock is taken.
--
-- NOTHING ELSE MAY GO IN THIS FILE. Prisma wraps each migration in a
-- transaction, and Postgres forbids *using* an enum value in the same
-- transaction that added it — a backfill or a DEFAULT referencing 'HIDDEN'
-- here would fail with `unsafe use of new value "HIDDEN" of enum type
-- ReviewStatus`. There is nothing to backfill in any case: rejected reviews
-- were previously deleted outright, so no historical row needs reinterpreting.

-- AlterEnum
ALTER TYPE "ReviewStatus" ADD VALUE 'HIDDEN';
