-- A website booking becomes a REQUEST the receptionist confirms by phone,
-- rather than an instantly-confirmed appointment.
--
-- Hand-written: `prisma migrate dev` refuses to run non-interactively whenever
-- it has any warning to show, and adding an enum value is one of those cases
-- (see CLAUDE.md's Prisma 7 note). Apply with `prisma migrate deploy`.
--
-- Safe on a database with rows: this only widens the type. No existing booking
-- changes value — every historical row was genuinely confirmed under the old
-- rules and stays CONFIRMED.
--
-- NOTHING ELSE MAY GO IN THIS FILE. Prisma wraps each migration in a
-- transaction, and Postgres forbids *using* an enum value in the transaction
-- that added it. The `ALTER COLUMN … SET DEFAULT 'REQUESTED'` this change also
-- needs would fail here with `unsafe use of new value "REQUESTED" of enum type
-- BookingStatus`; it lives in the migration immediately after this one, which
-- Prisma runs in its own transaction.

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'REQUESTED';
