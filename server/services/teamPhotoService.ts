import { sniffImageType } from "@/lib/image-type";
import { prisma } from "@/lib/prisma";
import { TEAM_PHOTO_BASE, teamPhotoIdFromUrl, teamPhotoUrl } from "@/lib/team-photo-url";

/**
 * Uploaded staff photos.
 *
 * See prisma/schema.prisma's TeamPhoto for why the bytes live in Postgres
 * rather than on disk or in an object store.
 */

/**
 * 4 MB.
 *
 * Generous for a headshot straight off a phone, and small enough that a
 * hostile upload cannot be used to fill the practice's database. The route
 * checks Content-Length first so an oversized body is refused before it is
 * buffered, and then re-checks the real length — a Content-Length header is
 * a claim, not a fact.
 */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export class PhotoTooLargeError extends Error {
  constructor() {
    super("That image is too large.");
    this.name = "PhotoTooLargeError";
  }
}

export class UnsupportedPhotoError extends Error {
  constructor() {
    super("That file isn't an image we can use.");
    this.name = "UnsupportedPhotoError";
  }
}

/**
 * Stores an upload, returning the path to serve it from.
 *
 * The format is decided by `sniffImageType` reading the leading bytes — never
 * from the filename or the client's Content-Type, both of which the uploader
 * controls and both of which end up echoed to visitors as a response header.
 */
async function createPhoto(bytes: Uint8Array): Promise<{ id: string; url: string }> {
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new PhotoTooLargeError();

  const type = sniffImageType(bytes);
  if (!type) throw new UnsupportedPhotoError();

  const photo = await prisma.teamPhoto.create({
    data: {
      contentType: type.contentType,
      data: Buffer.from(bytes),
      byteSize: bytes.byteLength,
    },
    select: { id: true },
  });

  return { id: photo.id, url: teamPhotoUrl(photo.id) };
}

async function getPhoto(id: string) {
  return prisma.teamPhoto.findUnique({
    where: { id },
    select: { contentType: true, data: true, byteSize: true },
  });
}

/**
 * Removes photos no team member points at any more.
 *
 * Uploads are decoupled from the roster save — someone can pick a photo and
 * then navigate away, or replace one and save — so orphans are expected rather
 * than exceptional. Called after a successful roster save, where the set of
 * referenced photos is known.
 *
 * Deliberately not a foreign key with a cascade: the upload has to be able to
 * exist before the member row does.
 */
async function deleteUnreferencedPhotos(): Promise<number> {
  const referenced = await prisma.teamMember.findMany({
    where: { photo: { startsWith: `${TEAM_PHOTO_BASE}/` } },
    select: { photo: true },
  });

  const keep = referenced
    .map((member) => teamPhotoIdFromUrl(member.photo))
    .filter((id): id is string => id !== null);

  const { count } = await prisma.teamPhoto.deleteMany({
    where: {
      id: { notIn: keep.length > 0 ? keep : ["__none__"] },
      // A grace period, so an upload that has not been saved into the roster
      // yet is not swept away while the admin is still typing a bio.
      createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  return count;
}

export const teamPhotoService = {
  createPhoto,
  getPhoto,
  deleteUnreferencedPhotos,
};
