-- Admin email: a configurable mail transport the practice sets up itself, and
-- a record of every message the dashboard sends.
--
-- EmailSettings is the third singleton (always id 1, every column defaulted,
-- materialised by upsert on first read). Separate from SiteSettings on purpose:
-- the root layout reads that row on every page render, and no anonymous
-- homepage view should be pulling SMTP ciphertext into memory. Its default
-- provider is SERVER, so an existing deployment keeps reading RESEND_API_KEY
-- from the environment and behaves exactly as it did before this migration.
--
-- resendApiKey and smtpPassword hold ciphertext from lib/secret-box.ts
-- (AES-256-GCM, key derived from AUTH_SECRET via HKDF), never plaintext. A
-- database dump therefore yields no working credential for the practice's
-- mailbox.
--
-- MailMessage carries two nullable foreign keys rather than a polymorphic
-- subjectType/subjectId pair, and the CHECK below is what makes "exactly one of
-- them" true. Prisma cannot express that constraint, so it is written here by
-- hand and `migrate dev`'s diff will neither drop it nor recreate it — a
-- rebuilt migration has to carry it forward deliberately.
--
-- ON DELETE CASCADE on both is load-bearing rather than tidy: deleteSlot
-- removes CANCELLED bookings along with the slot, and a message row holding
-- that key would block the delete at the database. It is also the retention
-- mechanism — these rows hold a patient's address and the full text of a
-- message about their treatment, and they must not outlive the record they
-- belong to.

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('SERVER', 'RESEND', 'SMTP');

-- CreateEnum
CREATE TYPE "MailStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "provider" "EmailProvider" NOT NULL DEFAULT 'SERVER',
    "fromName" TEXT,
    "fromAddress" TEXT,
    "replyTo" TEXT,
    "resendApiKey" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByEmail" TEXT,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailMessage" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "leadId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "templateKey" TEXT,
    "status" "MailStatus" NOT NULL,
    "provider" "EmailProvider",
    "error" TEXT,
    "senderEmail" TEXT,
    "senderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailMessage_bookingId_createdAt_idx" ON "MailMessage"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "MailMessage_leadId_createdAt_idx" ON "MailMessage"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "MailMessage_createdAt_idx" ON "MailMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one subject. Not expressible in schema.prisma — see the model's doc
-- comment. Without it a row can belong to a booking AND a lead (shown twice, in
-- two patients' histories) or to neither (unreachable, and never cascaded away).
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_one_subject"
    CHECK (num_nonnulls("bookingId", "leadId") = 1);
