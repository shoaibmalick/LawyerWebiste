-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "audience" TEXT,
ADD COLUMN     "jurisdiction" TEXT,
ADD COLUMN     "practiceAreaSlug" TEXT,
ADD COLUMN     "serviceSlug" TEXT;

-- CreateIndex
CREATE INDEX "Lead_serviceSlug_createdAt_idx" ON "Lead"("serviceSlug", "createdAt");
