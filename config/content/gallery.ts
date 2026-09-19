import { gallerySchema } from "../schema/content.schema";

/**
 * Empty in the template on purpose.
 *
 * A gallery is a client's own photography, and there is no such thing as a
 * default one. The block renders nothing at all for an empty list (see
 * components/blocks/gallery.tsx), so a client that has not filled this in
 * shows no heading above an empty grid — which is what an unfilled gallery
 * looked like before, and reads as a loading failure rather than as an
 * absence.
 */
export const gallery = gallerySchema.parse([]);
