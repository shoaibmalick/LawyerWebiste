-- Two tables behind the new /dashboard/settings panel, which lets the practice
-- change the site's palette and edit its own staff list without a redeploy.
--
-- SiteSettings follows the PaymentSettings singleton pattern (always id 1,
-- every column defaulted, materialised by upsert on first read) but is a
-- separate row because PaymentSettings belongs to the optional "payments"
-- feature and is meaningless in a client that doesn't take deposits.
--
-- teamSeededAt disambiguates an empty TeamMember table. teamService seeds from
-- config/content/team.ts when there are no rows, so without this marker an
-- admin who deletes every member would find the config roster restored on the
-- next page load. Zero rows plus a timestamp means "deliberately empty".
--
-- TeamMember is a deliberate exception to the rule that agency-authored
-- content lives in /config: a staff list changes when someone joins or leaves,
-- which is the business owner's operational fact rather than the agency's
-- design decision. Same distinction PaymentSettings already draws.

-- CreateEnum
CREATE TYPE "ThemePreset" AS ENUM ('BRAND', 'MIDNIGHT', 'HARBOUR');

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "themePreset" "ThemePreset" NOT NULL DEFAULT 'BRAND',
    "teamSeededAt" TIMESTAMP(3),

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "photo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_slug_key" ON "TeamMember"("slug");

-- CreateIndex
CREATE INDEX "TeamMember_sortOrder_idx" ON "TeamMember"("sortOrder");
