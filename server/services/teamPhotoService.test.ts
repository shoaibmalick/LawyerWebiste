import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  MAX_PHOTO_BYTES,
  PhotoTooLargeError,
  teamPhotoService,
  UnsupportedPhotoError,
} from "./teamPhotoService";

/** A minimal but genuinely well-formed PNG header. */
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

beforeEach(async () => {
  await prisma.teamMember.deleteMany();
  await prisma.teamPhoto.deleteMany();
});

afterAll(async () => {
  await prisma.teamMember.deleteMany();
  await prisma.teamPhoto.deleteMany();
  await prisma.$disconnect();
});

describe("createPhoto", () => {
  it("stores the bytes and hands back a servable path", async () => {
    const photo = await teamPhotoService.createPhoto(PNG);

    expect(photo.url).toBe(`/api/team-photo/${photo.id}`);

    const stored = await teamPhotoService.getPhoto(photo.id);
    expect(stored?.contentType).toBe("image/png");
    expect(stored?.byteSize).toBe(PNG.byteLength);
    expect(new Uint8Array(stored!.data)).toEqual(PNG);
  });

  /**
   * The content type is decided by reading the bytes, never by trusting the
   * filename or the client's Content-Type — the stored value is echoed back to
   * every visitor as a response header, so it must not be attacker-chosen.
   */
  it("takes the content type from the bytes", async () => {
    const photo = await teamPhotoService.createPhoto(JPEG);
    expect((await teamPhotoService.getPhoto(photo.id))?.contentType).toBe("image/jpeg");
  });

  it("refuses a file that is not an image", async () => {
    const script = new Uint8Array([..."#!/bin/sh\nrm -rf /"].map((c) => c.charCodeAt(0)));

    await expect(teamPhotoService.createPhoto(script)).rejects.toBeInstanceOf(
      UnsupportedPhotoError,
    );
    expect(await prisma.teamPhoto.count()).toBe(0);
  });

  /**
   * SVG is a document, not a bitmap — it carries script. Served from our own
   * origin it would be stored XSS against the admin session that manages this
   * very page.
   */
  it("refuses an SVG", async () => {
    const svg = new Uint8Array([...'<svg onload="alert(1)">'].map((c) => c.charCodeAt(0)));

    await expect(teamPhotoService.createPhoto(svg)).rejects.toBeInstanceOf(UnsupportedPhotoError);
  });

  it("refuses anything over the size cap", async () => {
    const huge = new Uint8Array(MAX_PHOTO_BYTES + 1);
    huge.set(PNG);

    await expect(teamPhotoService.createPhoto(huge)).rejects.toBeInstanceOf(PhotoTooLargeError);
    expect(await prisma.teamPhoto.count()).toBe(0);
  });
});

describe("deleteUnreferencedPhotos", () => {
  /** The sweep has an hour's grace, so tests have to age rows past it. */
  async function age(id: string) {
    await prisma.teamPhoto.update({
      where: { id },
      data: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });
  }

  it("keeps a photo a team member points at", async () => {
    const photo = await teamPhotoService.createPhoto(PNG);
    await age(photo.id);

    await prisma.teamMember.create({
      data: { slug: "jane", name: "Jane", role: "Dentist", bio: "Hello", photo: photo.url },
    });

    await teamPhotoService.deleteUnreferencedPhotos();

    expect(await teamPhotoService.getPhoto(photo.id)).not.toBeNull();
  });

  it("removes one nothing points at", async () => {
    const orphan = await teamPhotoService.createPhoto(PNG);
    await age(orphan.id);

    const removed = await teamPhotoService.deleteUnreferencedPhotos();

    expect(removed).toBe(1);
    expect(await teamPhotoService.getPhoto(orphan.id)).toBeNull();
  });

  /**
   * The trap this grace period exists for. Uploading happens before saving, so
   * between the two the photo is referenced by nothing at all — a sweep
   * triggered by someone else's save in that window would delete the image out
   * from under an admin who was still typing a bio.
   */
  it("spares a very recent upload that has not been saved yet", async () => {
    const justUploaded = await teamPhotoService.createPhoto(PNG);

    const removed = await teamPhotoService.deleteUnreferencedPhotos();

    expect(removed).toBe(0);
    expect(await teamPhotoService.getPhoto(justUploaded.id)).not.toBeNull();
  });

  it("does not delete everything when the roster is empty", async () => {
    // `notIn: []` matches nothing in some dialects and everything in others;
    // the service substitutes a sentinel rather than relying on that.
    const orphan = await teamPhotoService.createPhoto(PNG);
    await age(orphan.id);
    const kept = await teamPhotoService.createPhoto(JPEG);

    const removed = await teamPhotoService.deleteUnreferencedPhotos();

    expect(removed).toBe(1);
    // The recent one survives on the grace period, proving the query did not
    // simply match every row.
    expect(await teamPhotoService.getPhoto(kept.id)).not.toBeNull();
  });
});
