import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth-guards";
import {
  MAX_PHOTO_BYTES,
  PhotoTooLargeError,
  teamPhotoService,
  UnsupportedPhotoError,
} from "@/server/services/teamPhotoService";

/**
 * Staff photo upload. Admin only.
 *
 * Deliberately **not** routed through `guardPublicPost`: that helper exists for
 * anonymous JSON endpoints and enforces `application/json`, which an upload is
 * not. The protections it provides are still here, in the form this route
 * needs — an auth check instead of a rate limit, a byte cap instead of a JSON
 * body cap.
 *
 * `requireAdmin` first, before anything is read. An unauthenticated caller must
 * not be able to make the server buffer four megabytes.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      // 401, not the 500 an uncaught throw produces. This endpoint will be
      // probed; a rejection is a normal outcome, not a fault.
      return NextResponse.json({ error: "Not authorised." }, { status: 401 });
    }
    throw error;
  }

  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "That image is too large." }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  // Checked again from the real bytes: Content-Length is a claim.
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const photo = await teamPhotoService.createPhoto(bytes);
    return NextResponse.json({ url: photo.url }, { status: 201 });
  } catch (error) {
    if (error instanceof PhotoTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    if (error instanceof UnsupportedPhotoError) {
      // The message names the formats rather than saying "invalid", because
      // the most likely cause is a real person uploading a HEIC off an iPhone.
      return NextResponse.json(
        { error: "Use a JPEG, PNG, WebP, AVIF or GIF image." },
        { status: 415 },
      );
    }
    throw error;
  }
}
