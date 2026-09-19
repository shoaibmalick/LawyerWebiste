-- Uploaded staff photos, stored as bytes.
--
-- In the database rather than on disk because the deploy target's filesystem
-- is read-only and ephemeral: writing into /public works in local development
-- and then silently does nothing in production.
--
-- No foreign key to TeamMember on purpose — an upload happens before the
-- member row exists (add a person, choose a photo, then save). The upload
-- hands back a URL that goes into TeamMember.photo like any other path.
-- CreateTable
CREATE TABLE "TeamPhoto" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamPhoto_pkey" PRIMARY KEY ("id")
);
