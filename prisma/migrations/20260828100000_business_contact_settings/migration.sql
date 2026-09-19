-- Contact details and opening hours become editable at /dashboard/settings, so
-- a business can correct its own phone number or change Saturday's hours
-- without an agency redeploy. These same fields feed the LocalBusiness JSON-LD,
-- so a stale one is wrong in search results as well as on the page — and the
-- business is the only party who knows when it changed.
--
-- **Every column is nullable and null means "use config/site.config.ts".**
-- These are overrides, not a seeded copy, which is the difference from how the
-- team roster works: every field here is required, so there is no ambiguous
-- "the admin cleared it on purpose" state and no seeded-marker column is
-- needed. Clearing a field is a supported way back to the configured value.
--
-- Safe to apply to a populated database and a no-op for any deployment that
-- never opens the new panel: with every column null the site renders exactly
-- what config renders today, including the structured data.

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressCountry" TEXT,
ADD COLUMN     "addressState" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "addressZip" TEXT,
ADD COLUMN     "businessEmail" TEXT,
ADD COLUMN     "businessPhone" TEXT,
-- The seven-day week as [{ day, opens, closes }]. Json rather than fourteen
-- nullable time columns, and rather than its own table: it is always read and
-- written whole and never queried into.
ADD COLUMN     "openingHours" JSONB;
