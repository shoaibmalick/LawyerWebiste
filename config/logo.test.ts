import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { LogoAsset } from "@/config/schema/site.schema";
import { siteConfig } from "@/config/site.config";

/**
 * The logo's declared size has to match the file, and nothing else checks.
 *
 * `next/image` needs `width` and `height` at render time, and a logo reached by
 * a config string cannot be statically imported — so the numbers are written
 * down in `site.config.ts` by hand. Nothing reconciles them with the PNGs, and
 * the failure is silent: the image renders at whatever aspect ratio the config
 * claims, so a re-export at a different crop leaves a subtly stretched monogram
 * in the header on every page of the site and no error anywhere.
 *
 * That is a live risk rather than a hypothetical one, because
 * `scripts/extract-logo.mjs` re-derives the crop from the artwork every time it
 * runs. Revised artwork with different spacing produces a different box, and
 * the script prints the new numbers precisely because it cannot apply them
 * itself.
 *
 * The header is read from the PNG rather than decoded with an image library:
 * the eight bytes after the IHDR marker are the dimensions, it needs no
 * dependency, and this test would otherwise be the only thing in the suite
 * reaching for one.
 */

const PUBLIC = path.join(process.cwd(), "public");

function pngSize(src: string): { width: number; height: number } {
  const file = readFileSync(path.join(PUBLIC, src));

  // 8-byte signature, then a chunk header of length + type; IHDR is first.
  expect(file.subarray(1, 4).toString("latin1"), `${src} is not a PNG`).toBe("PNG");
  expect(file.subarray(12, 16).toString("latin1"), `${src} does not open with IHDR`).toBe("IHDR");

  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

describe("the firm's logo", () => {
  const logo = siteConfig.business.logo;

  const declared = Object.entries(logo ?? {}) as [string, LogoAsset][];

  it("is configured at all", () => {
    // Guards the loop below: `it.each` over an empty list passes vacuously, so
    // deleting the logo block would silently delete this whole test file's
    // coverage along with it.
    expect(declared.length).toBeGreaterThan(0);
  });

  it.each(declared)("%s is the size site.config.ts says it is", (_name, asset) => {
    expect(pngSize(asset.src)).toEqual({ width: asset.width, height: asset.height });
  });

  it("uses the same artwork at the same crop for both lockups", () => {
    // The reversed lockup is the same cut-out with its wordmark repainted, so a
    // difference here means the two were exported from different runs and the
    // logo changes size between the footer and the share card.
    if (!logo?.lockupOnDark) return;

    expect(pngSize(logo.lockupOnDark.src)).toEqual(pngSize(logo.lockup.src));
  });

  it("ships a share card at the size the platforms crop to", () => {
    // 1.91:1. Off-ratio cards are centre-cropped, and the first thing to go is
    // the top and bottom of the lockup.
    expect(siteConfig.seo.ogImage).toBeDefined();
    expect(pngSize(siteConfig.seo.ogImage!)).toEqual({ width: 1200, height: 630 });
  });
});
