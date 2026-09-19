import Image from "next/image";

import type { GalleryImage } from "@/config/schema/content.schema";

type GalleryProps = {
  images: GalleryImage[];
};

/**
 * A business's own work, shown rather than described.
 *
 * Two decisions carried over from the first version of this block, which lived
 * in a client repo before it lived here:
 *
 * Equal cells, two columns. An earlier layout gave the first image a 2x2 cell;
 * with four images that leaves an empty quarter at the bottom right, and a
 * visible hole reads as a broken grid rather than as art direction. The
 * asymmetry only pays off at five or more images, which is not the case this
 * has to be safe for.
 *
 * Nothing renders for an empty list. Every client inherits this file, most of
 * them with no photographs yet, and a heading above an empty grid looks like a
 * loading failure — the same reason team-grid.tsx returns null for an empty
 * roster.
 */
export function Gallery({ images }: GalleryProps) {
  if (images.length === 0) return null;

  return (
    <section id="gallery" className="border-border bg-secondary/30 border-t">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-foreground text-3xl font-semibold tracking-tight">Our work</h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {images.map((image) => (
            <li key={image.src}>
              <figure className="flex h-full flex-col">
                <div className="bg-muted relative aspect-[3/2] w-full overflow-hidden rounded-xl">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                {image.caption && (
                  <figcaption className="text-muted-foreground mt-3 text-sm text-pretty">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
