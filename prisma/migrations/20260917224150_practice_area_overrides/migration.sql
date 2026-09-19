-- CreateEnum
CREATE TYPE "PracticeAreaKind" AS ENUM ('CATEGORY', 'SERVICE');

-- CreateTable
CREATE TABLE "PracticeAreaOverride" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "PracticeAreaKind" NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "summaryOverride" TEXT,
    "ctaOverride" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeAreaOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeAreaOverride_slug_key" ON "PracticeAreaOverride"("slug");

-- CreateIndex
CREATE INDEX "PracticeAreaOverride_kind_sortOrder_idx" ON "PracticeAreaOverride"("kind", "sortOrder");
