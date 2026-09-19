/**
 * Identify an uploaded image from its own bytes.
 *
 * ## Why not the filename or the Content-Type
 *
 * Both are supplied by whoever is uploading. A file called `portrait.png` sent
 * as `image/png` can contain anything at all, and the value we trust here is
 * echoed straight back to every visitor as a response header. Trusting the
 * client's word for it means an attacker who reaches the upload endpoint can
 * choose the Content-Type the browser sees — which is the whole game.
 *
 * So the format is read from the leading bytes, and the stored Content-Type is
 * ours rather than theirs. Anything unrecognised is refused outright.
 *
 * ## Why SVG is not on the list
 *
 * SVG is a document, not a bitmap: it can carry `<script>`, event handlers and
 * external references. Served from our own origin it would be stored XSS with
 * a session attached — the admin's session, since /dashboard is where these
 * are managed. `photo` fields typed by hand still permit `.svg` under /public,
 * because those are files the agency put there deliberately; an upload is a
 * different trust level and gets a different answer.
 *
 * There is also no magic number for SVG — it is just text — so it could not be
 * sniffed reliably even if we wanted it.
 */

export type ImageType = {
  contentType: string;
  extension: string;
};

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** ASCII, for the container tags that identify RIFF and ISO-BMFF files. */
function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

/**
 * Returns the format, or null if the bytes are not an image we accept.
 *
 * Order matters only in that the cheapest and most specific checks come first;
 * the signatures themselves do not overlap.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: "image/png", extension: "png" };
  }

  // GIF: "GIF87a" or "GIF89a"
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") {
    return { contentType: "image/gif", extension: "gif" };
  }

  // WebP: "RIFF" ???? "WEBP" — the four bytes between are the file length.
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return { contentType: "image/webp", extension: "webp" };
  }

  // AVIF: ISO-BMFF, "ftyp" at offset 4 with an `avif`/`avis` brand.
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "avif" || brand === "avis") {
      return { contentType: "image/avif", extension: "avif" };
    }
  }

  return null;
}
