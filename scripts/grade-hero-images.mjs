/**
 * Grade the hero photographs to one exposure, so the scrim can be light.
 *
 *   node scripts/grade-hero-images.mjs        (or: npm run hero:grade)
 *
 * Reads `design/hero-source/`, which holds the files exactly as they were
 * licensed and downloaded, and writes the graded versions into
 * `public/images/hero/`. Never edit the files under /public by hand — they are
 * output, and the next run overwrites them.
 *
 * ## Why this exists
 *
 * The three photographs were chosen for their subjects and never compared for
 * exposure. Measured over the region the hero copy sits in:
 *
 *   toronto-skyline-blue-hour    0.233
 *   brooklyn-bridge-dusk         0.318      <- 4x the darkest
 *   classical-colonnade-night    0.079
 *
 * A scrim has to be sized for the *worst* frame, so one bright photograph was
 * setting the density for all three — which is why the hero read as a navy
 * field with a faint picture behind it, and why the darkest of the three was
 * being crushed to nothing to make the brightest one legible. It also made the
 * crossfade flash, because one slide was visibly brighter than its neighbours.
 *
 * Grading them to a common exposure first lets the scrim drop a long way. The
 * two darker frames gain most: they are no longer paying for the outlier.
 *
 * ## It only ever darkens
 *
 * Lifting a night photograph to hit a target amplifies its noise and does it in
 * the shadows, where this palette puts its text. So a frame already at or below
 * the target is copied through untouched, and the target is chosen to sit near
 * the darker end of whatever the set contains.
 *
 * The adjustment is a plain per-channel multiply, applied in sRGB and therefore
 * corrected by the 2.2 exponent when solving for it. Not a curve or a levels
 * adjustment: those change the *look* of somebody else's photograph, and the
 * licences here permit use, not passing off a re-grade as the original frame.
 */

import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "design", "hero-source");
const OUT = path.join(ROOT, "public", "images", "hero");

/**
 * Relative luminance the copy region's 99th percentile should land on.
 *
 * **A percentile, not the mean, and that correction mattered.** Grading on the
 * mean brought all three frames to ~0.17 and the contrast check still failed on
 * the darkest of them: `classical-colonnade-night` averages 0.095 but its lit
 * stone columns reach 0.690, and a scrim has to survive the brightest pixel
 * behind a glyph rather than the average one. Measured over the copy zone:
 *
 *              mean    p99    max
 *   toronto    0.262  0.345  0.376
 *   brooklyn   0.342  0.901  1.000   <- blown sky
 *   colonnade  0.095  0.550  0.690   <- darkest average, brightest highlights
 *
 * On the mean those three look like two problems and one innocent frame. On p99
 * they are what they are: the check samples the lightest pixel in each text box,
 * so p99 is the statistic that governs whether it passes.
 *
 * p99 rather than the maximum, because a handful of blown pixels would drag the
 * whole frame into the dark to fix a speck. The scrim covers the remainder.
 *
 * ## It went to 0.16 for one run, and came back
 *
 * Kept here because the reasoning is still live. Two daylight frames were added
 * (see below), the eyebrow failed at 4.29, and grading the whole set to 0.16
 * fixed it — at the cost of ~8% of the mean luminance on all five. The eyebrow
 * turned out not to be the problem: as a block `<p>` it spanned the full measure
 * while its text sat in the left 15%, so the check was sampling 1270px of
 * photograph to judge a word occupying 190 of them. `w-fit` on that element
 * (components/blocks/firm-hero.tsx) took it to 8.68 on its own, and the target
 * went back to 0.20. **Check what the box actually covers before darkening every
 * photograph on the site to fix one number.**
 *
 * ## Why 0.20 and not lower
 *
 * 0.20 was right for three night and dusk frames. Two daylight frames were then
 * added — a sunlit colonnade at p99 **0.961** and a boardroom at **0.917** — and
 * the check failed on the eyebrow at **4.29** against a 4.5 bar, over the
 * colonnade. Hitting the same p99 is not the same as having the same
 * distribution: a frame that is bright nearly everywhere puts far more of its
 * copy zone near p99 than a night shot does, so a 12px run lands on a lit patch
 * that the darker frames simply do not have.
 *
 * ## 0.24, and the frame that was capping it
 *
 * Asked again for a brighter hero, the ladder was measured rather than guessed.
 * With five frames: 0.20 passes, 0.22 passes but lands the headline's brass at
 * 3.02 against a 3.0 bar, 0.24 fails two runs, 0.28 fails three. The same frame
 * failed first at every step — `classical-colonnade-night`, whose lit stone
 * columns reach 0.69 while the frame averages 0.095.
 *
 * A percentile cannot fix that one: its highlights *are* its subject, so grading
 * it to match the set means crushing the thing worth looking at, and it was the
 * least visible of the five once composited anyway. Retired to
 * `design/hero-retired/`. With it gone 0.24 passes with **wider** margins than
 * 0.20 had with it in (`rotatingWord` 3.26 vs 3.20), and every remaining frame
 * is about 30% brighter.
 *
 * The lesson generalises: when one photograph is failing first at every setting,
 * the question is whether it belongs in the set, not what the constant should be.
 *
 * The set therefore stays at 0.24, which is as bright as the brass will allow.
 * The binding runs are both `accent-on-ink`: the rotating word in the headline
 * at 3.20 against a 3.0 bar, and the third proof label at 4.66 against 4.5.
 * Raising this constant moves both, so re-run `npm run check:hero-contrast`
 * before keeping any increase.
 */
const TARGET_LUMA = 0.24;

/** sRGB gamma. The multiply happens in sRGB, so solving for it uses this. */
const GAMMA = 2.2;

/**
 * The part of the frame the hero's copy actually covers.
 *
 * Left 60%, top 55%. Grading on the whole frame would let a large expanse of
 * dark water or sky pull the average down and leave the corner behind the
 * headline as bright as it ever was — which is the only corner that matters.
 */
const COPY_ZONE = { width: 0.6, height: 0.55 };

const channel = (value) => {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** GAMMA;
};

/** 99th-percentile relative luminance of the copy zone, sampled at 400px wide. */
async function copyZoneLuma(file) {
  const { data, info } = await sharp(file).resize(400).raw().toBuffer({ resolveWithObject: true });

  const maxX = Math.floor(info.width * COPY_ZONE.width);
  const maxY = Math.floor(info.height * COPY_ZONE.height);
  const values = [];

  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < maxX; x++) {
      const i = (y * info.width + x) * info.channels;
      values.push(
        0.2126 * channel(data[i]) + 0.7152 * channel(data[i + 1]) + 0.0722 * channel(data[i + 2]),
      );
    }
  }

  values.sort((a, b) => a - b);
  return values[Math.floor(0.99 * (values.length - 1))];
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const files = readdirSync(SOURCE).filter((f) => /\.jpe?g$/i.test(f));
  if (files.length === 0) {
    throw new Error(`No photographs in ${SOURCE}. The originals belong there, not in /public.`);
  }

  for (const file of files) {
    const from = path.join(SOURCE, file);
    const to = path.join(OUT, file);
    const before = await copyZoneLuma(from);

    if (before <= TARGET_LUMA) {
      // Already at or under. Copy through rather than lifting it — see above.
      copyFileSync(from, to);
      console.log(`${file.padEnd(30)} ${before.toFixed(3)} -> unchanged (already at target)`);
      continue;
    }

    // L scales as factor^GAMMA, so the multiply that lands on TARGET_LUMA is
    // the gamma-th root of the ratio.
    const factor = (TARGET_LUMA / before) ** (1 / GAMMA);
    await sharp(from).linear(factor, 0).jpeg({ quality: 82, mozjpeg: true }).toFile(to);

    const after = await copyZoneLuma(to);
    console.log(
      `${file.padEnd(30)} ${before.toFixed(3)} -> ${after.toFixed(3)}  (x${factor.toFixed(3)})`,
    );
  }

  console.log(
    "\nWrote public/images/hero/. Re-run `npm run check:hero-contrast` afterwards:",
    "\nthe scrim in components/blocks/firm-hero.tsx is tuned against these exposures.",
  );
}

await main();
