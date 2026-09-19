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
 * any gallery a client adds): an image added there belongs here too, and one
 * that stops rendering comes out. `classical-colonnade-night` (Mehmet Turgut
 * Kirkgoz, Pexels) was removed when it left the hero rotation — its source is
 * kept in `design/hero-retired/`, outside /public, so nothing serves it.
 *
 * **The hero photographs are published darker than they were licensed.**
 * `npm run hero:grade` applies a flat per-channel multiply so they all sit at
 * one exposure; the files as supplied are in `design/hero-source/`, outside
 * /public. That is a legitimate adjustment rather than a silent one, which is
 * why it is stated here as well as in the script: a reader who follows
 * `sourceUrl` will find a brighter frame than the one on the page, and should
 * be able to tell that this site darkened it rather than that it is a different
 * photograph. Nothing else about the images is altered — no crop beyond the
 * original framing, no colour grading, no composition changes.
 */
export const imageCredits = imageCreditsSchema.parse([
  /*
   * The two entries below are INCOMPLETE, and deliberately say so on the page.
   *
   * Both files were supplied by the client with no provenance. CLAUDE.md's
   * onboarding checklist is explicit about what to do here: "If nobody knows
   * yet, say so in the entry rather than writing a plausible-looking
   * photographer and licence URL — the attribution page is the last place a
   * reader expects to be misled." A fabricated Unsplash URL alongside three
   * real ones would be indistinguishable from them, which is the whole risk.
   *
   * Both also look machine-generated, which if true changes what "creator" and
   * "licence" even mean and is worth settling before this ships anywhere
   * public. Replace these two entries once the client answers; until then the
   * /credits page tells a reader exactly as much as we actually know.
   */
  {
    src: "/images/hero/boardroom-scales-harbour.jpg",
    usedFor: "Homepage hero (first frame)",
    title: "Boardroom at dusk with a brass balance scale, overlooking Sydney Harbour",
    creator: "Unknown — supplied by the client, provenance not yet confirmed",
    license: "Unknown — not yet confirmed",
    licenseUrl: "Not yet confirmed",
    sourceUrl: "Not yet confirmed",
    attributionRequired: false,
  },
  {
    src: "/images/hero/colonnade-professionals-day.jpg",
    usedFor: "Homepage hero (second frame)",
    title: "Two people in business dress walking through a marble colonnade by a harbour",
    creator: "Unknown — supplied by the client, provenance not yet confirmed",
    license: "Unknown — not yet confirmed",
    licenseUrl: "Not yet confirmed",
    sourceUrl: "Not yet confirmed",
    attributionRequired: false,
  },
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
]);
