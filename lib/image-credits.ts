import type { ImageCredit } from "@/config/schema/content.schema";

/**
 * The credits owed for the images the site is currently displaying.
 *
 * Attribution used to be kept in step by hand: config/content/image-credits.ts
 * carries a comment asking whoever edits team.ts or gallery.ts to remember to
 * update it too. That was survivable while both files were agency-authored and
 * changed together in one commit. It stops being survivable now that a
 * receptionist can replace a team photo from the dashboard — and the one image
 * on this site whose licence legally compels credit (CC BY 2.0) is a team
 * photo.
 *
 * Both failure directions were real. Replace that photo and leave the entry,
 * and the site credits a photographer for a picture that isn't theirs. Remove
 * the entry and leave the file, and the licence is breached. Deriving the list
 * from what actually renders makes both impossible.
 *
 * Note what this deliberately does *not* do: it cannot tell whether a photo an
 * admin points at is itself licensed. Someone who types the path of a
 * different CC BY file in /public gets an uncredited image, and
 * public/images/CREDITS.md lists four files that must never be published at
 * all. Closing that would need a picker restricted to known-safe paths rather
 * than a free-text field.
 */
export function creditsForDisplayedImages(
  credits: ImageCredit[],
  displayedSrcs: Iterable<string | null | undefined>,
): ImageCredit[] {
  const shown = new Set<string>();
  for (const src of displayedSrcs) {
    if (src) shown.add(src);
  }

  return credits.filter((credit) => shown.has(credit.src));
}
