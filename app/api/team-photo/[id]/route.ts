import { NextResponse } from "next/server";
import { teamPhotoService } from "@/server/services/teamPhotoService";

/**
 * Serves an uploaded staff photo.
 *
 * Public and unauthenticated on purpose — these appear in the "Who you'll
 * meet" section of the marketing homepage, so they have to be readable by
 * anyone. The id is a cuid, so the URL is not guessable, but nothing here
 * treats that as a secret: a staff portrait on a public website is public.
 *
 * `params` is a Promise in Next 16.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const photo = await teamPhotoService.getPhoto(id);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      // Our own sniffed value, never anything the uploader supplied.
      "Content-Type": photo.contentType,
      "Content-Length": String(photo.byteSize),
      // Immutable: the id is content-addressed in practice — replacing a photo
      // creates a new row with a new id rather than mutating this one — so a
      // given URL's bytes never change.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Belt and braces alongside the global nosniff header: even if the
      // stored type were somehow wrong, the browser must not go looking for a
      // more interesting interpretation.
      "X-Content-Type-Options": "nosniff",
      // Nothing here is meant to be executed or opened as a document.
      "Content-Disposition": "inline",
    },
  });
}
