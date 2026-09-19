import { imageCreditsSchema } from "../schema/content.schema";

/**
 * Attribution for images this site displays. Rendered at /credits and linked
 * from the footer.
 *
 * Empty in the template because the starter kit ships no photography. Fill it
 * per client, and only with images that are **actually displayed** — a file
 * sitting unused in /public creates no obligation, and listing it buries the
 * entries that carry a real one.
 *
 * Why this exists at all: a CC BY or CC BY-SA licence requires the credit be
 * visible to visitors. A note in the repo does not satisfy that, and neither
 * does a markdown file in /public — served over HTTP it arrives as
 * text/markdown, which browsers download rather than display.
 *
 * While this list is empty, /credits returns 404 and the footer link is not
 * rendered, so an empty page is never shown. Both appear as soon as the first
 * entry is added.
 *
 * Keep it in step with whatever renders images (config/content/team.ts, and
 * any gallery a client adds): an image added there belongs here too.
 *
 * **The three hero photographs are published darker than they were licensed.**
 * `npm run hero:grade` applies a flat per-channel multiply so all three sit at
 * one exposure; the files as downloaded are in `design/hero-source/`, outside
 * /public. That is a legitimate adjustment rather than a silent one, which is
 * why it is stated here as well as in the script: a reader who follows
 * `sourceUrl` will find a brighter frame than the one on the page, and should
 * be able to tell that this site darkened it rather than that it is a different
 * photograph. Nothing else about the images is altered — no crop beyond the
 * original framing, no colour grading, no composition changes.
 */
export const imageCredits = imageCreditsSchema.parse([
  {
    src: "/images/hero/toronto-skyline-blue-hour.jpg",
    usedFor: "Homepage hero",
    title: "Toronto skyline and CN Tower at blue hour, from the Toronto Islands",
    creator: "Jochem Raat",
    license: "Unsplash License",
    licenseUrl: "https://unsplash.com/license",
    sourceUrl: "https://unsplash.com/photos/toronto-skyline-with-cn-tower-s0grRYEDaL4",
    // The Unsplash licence does not require visible credit. Listed anyway, as a
    // courtesy and so the provenance of every published image is recorded in
    // one place — `attributionRequired` is what separates the two cases.
    attributionRequired: false,
  },
  {
    src: "/images/hero/brooklyn-bridge-dusk.jpg",
    usedFor: "Homepage hero",
    title: "Brooklyn Bridge spanning the East River at dusk",
    creator: "Alexander Rotker",
    license: "Unsplash License",
    licenseUrl: "https://unsplash.com/license",
    sourceUrl: "https://unsplash.com/photos/landscape-photography-of-bridge--sQ4FsomXEs",
    attributionRequired: false,
  },
  {
    src: "/images/hero/classical-colonnade-night.jpg",
    usedFor: "Homepage hero",
    title: "Illuminated neoclassical colonnade and pediment at night",
    creator: "Mehmet Turgut Kirkgoz",
    license: "Pexels License",
    licenseUrl: "https://www.pexels.com/license/",
    sourceUrl:
      "https://www.pexels.com/photo/ancient-building-with-bedrocks-in-lights-at-night-6357114/",
    attributionRequired: false,
  },
]);
