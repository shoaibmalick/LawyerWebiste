/**
 * Cut the firm's logo out of the artwork it was supplied as.
 *
 *   node scripts/extract-logo.mjs            (or: npm run logo:generate)
 *
 * Reads `design/harbourline-logo-source.jpeg` and writes every logo file the
 * site uses. Run it again whenever the artwork is revised; nothing downstream
 * is hand-edited.
 *
 * ## Why there is a script here at all
 *
 * The logo arrived the way logos usually arrive: a presentation render. The
 * lockup is sitting on a grey wall, under a vignette, with a soft drop shadow
 * beneath it. Dropped onto the site as-is it is a grey rectangle in the header,
 * and the site's paper is #FAF9F7, so "close enough" is not close at all.
 *
 * Cutting it out by eye in an image editor is a one-off that nobody can repeat.
 * This is repeatable, and it records the two decisions that actually matter.
 *
 * ## Decision one: model the wall, do not filter it away
 *
 * The first attempt estimated the background morphologically — a max filter
 * wider than the thickest stroke erases the ink and leaves the wall. It does,
 * but a filter that wide also smears the vignette, and the error came back as a
 * grey cloud hanging around the monogram.
 *
 * The wall is a smooth gradient, so six coefficients per channel describe it
 * exactly (mean error 3.1 of 255, measured over the ~999k pixels the mask calls
 * wall). Fit it, subtract it, and the background is genuinely flat.
 *
 * ## Decision two: ask what the ink is, not how far it is from the wall
 *
 * "Different from the background" is the obvious alpha and it is wrong here,
 * because the drop shadow is also different from the background — about twenty
 * levels of it — so the shadow comes through at roughly half opacity and the
 * cutout carries a smudge of the wall it was supposed to leave behind.
 *
 * There are exactly two inks and they are separable by what they are:
 *
 *   gold      chroma 43-101      luma 95-223
 *   charcoal  chroma 9-13        luma 38-51
 *   wall      chroma 5-9         luma 139-182
 *   shadow    chroma under 10    luma ~20 below the wall it sits on
 *
 * So alpha is the larger of two answers — "how saturated is this" and "how much
 * darker than the wall is this" — and the shadow, being neither saturated nor
 * much darker, stays on the wall where it belongs.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "design", "harbourline-logo-source.jpeg");
const BRAND = path.join(ROOT, "public", "images", "brand");

/** Chroma at or under this is neutral: the wall, the shadow, the charcoal. */
const NEUTRAL_CHROMA = 12;
/** The ink the wordmark is drawn in, once repainted for a dark ground. */
const ON_DARK = { r: 0xed, g: 0xf1, b: 0xf5 };
/** The band the app icons and the share card sit on — theme.config.ts `ink`. */
const INK = { r: 0x0e, g: 0x21, b: 0x36, alpha: 1 };

// ---------------------------------------------------------------------------
// Separable filters. Each is O(1) per pixel, because the structuring elements
// here are 150px wide and the naive form is minutes rather than seconds.
// ---------------------------------------------------------------------------

/** Sliding-window min/max along one axis, via a monotonic deque. */
function morphLine(src, offset, stride, n, radius, out, displaces) {
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;

  for (let i = 0; i < n + radius; i++) {
    if (i < n) {
      const value = src[offset + i * stride];
      while (tail > head && displaces(src[offset + queue[tail - 1] * stride], value)) tail--;
      queue[tail++] = i;
    }
    const centre = i - radius;
    if (centre >= 0) {
      while (queue[head] < centre - radius) head++;
      out[offset + centre * stride] = src[offset + queue[head] * stride];
    }
  }
}

function morph(src, width, height, radius, kind) {
  const displaces = kind === "max" ? (held, next) => held <= next : (held, next) => held >= next;
  const tmp = new Float64Array(src.length);
  const out = new Float64Array(src.length);
  for (let y = 0; y < height; y++) morphLine(src, y * width, 1, width, radius, tmp, displaces);
  for (let x = 0; x < width; x++) morphLine(tmp, x, width, height, radius, out, displaces);
  return out;
}

function blur(src, width, height, radius) {
  const tmp = new Float64Array(src.length);
  const out = new Float64Array(src.length);

  const run = (from, to, offset, stride, n) => {
    let sum = 0;
    for (let i = 0; i < Math.min(radius, n); i++) sum += from[offset + i * stride];
    for (let i = 0; i < n; i++) {
      const entering = i + radius;
      const leaving = i - radius - 1;
      if (entering < n) sum += from[offset + entering * stride];
      if (leaving >= 0) sum -= from[offset + leaving * stride];
      const lo = Math.max(0, i - radius);
      const hi = Math.min(n - 1, i + radius);
      to[offset + i * stride] = sum / (hi - lo + 1);
    }
  };

  for (let y = 0; y < height; y++) run(src, tmp, y * width, 1, width);
  for (let x = 0; x < width; x++) run(tmp, out, x, width, height);
  return out;
}

// ---------------------------------------------------------------------------
// The wall, as a quadratic surface
// ---------------------------------------------------------------------------

/** Six terms: flat, both linear ramps, both curvatures, and the saddle. */
const basis = (x, y, width, height) => {
  const u = x / width - 0.5;
  const v = y / height - 0.5;
  return [1, u, v, u * u, v * v, u * v];
};

/** Gaussian elimination with partial pivoting. Six unknowns; nothing clever. */
function solve(matrix, rhs) {
  const n = rhs.length;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[pivot][i])) pivot = k;
    }
    [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
    [rhs[i], rhs[pivot]] = [rhs[pivot], rhs[i]];
    for (let k = i + 1; k < n; k++) {
      const factor = matrix[k][i] / matrix[i][i];
      for (let j = i; j < n; j++) matrix[k][j] -= factor * matrix[i][j];
      rhs[k] -= factor * rhs[i];
    }
  }
  const out = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = rhs[i];
    for (let j = i + 1; j < n; j++) sum -= matrix[i][j] * out[j];
    out[i] = sum / matrix[i][i];
  }
  return out;
}

function fitSurface(plane, mask, width, height) {
  const matrix = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const rhs = new Array(6).fill(0);
  // Every other pixel in each direction. A quarter of a million samples already
  // over-determines six coefficients by five orders of magnitude.
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const p = y * width + x;
      if (!mask[p]) continue;
      const f = basis(x, y, width, height);
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) matrix[i][j] += f[i] * f[j];
        rhs[i] += f[i] * plane[p];
      }
    }
  }
  return solve(matrix, rhs);
}

// ---------------------------------------------------------------------------

async function matte() {
  const { data, info } = await sharp(SOURCE).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const n = width * height;

  const raw = [0, 1, 2].map((c) => {
    const plane = new Float64Array(n);
    for (let p = 0; p < n; p++) plane[p] = data[p * channels + c];
    return plane;
  });
  // A 3x3 box, only for the measurements below. It removes the render's grain —
  // which is about five levels per channel, enough to read as faint ink — and
  // costs nothing, because the thinnest stroke in this artwork is ~8px.
  const smooth = raw.map((plane) => blur(plane, width, height, 1));

  const chroma = new Float64Array(n);
  const luma = new Float64Array(n);
  for (let p = 0; p < n; p++) {
    const [r, g, b] = [smooth[0][p], smooth[1][p], smooth[2][p]];
    chroma[p] = Math.max(r, g, b) - Math.min(r, g, b);
    luma[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Two passes. The first mask is a guess — neutral and not dark — and is good
  // enough to fit a surface with; the second is that surface's own opinion of
  // what it fits, which keeps the gold's darker edges from dragging it down.
  const mask = new Uint8Array(n);
  for (let p = 0; p < n; p++) mask[p] = chroma[p] < NEUTRAL_CHROMA && luma[p] > 120 ? 1 : 0;

  const wall = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  const evaluate = (coefficients) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        const f = basis(x, y, width, height);
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let i = 0; i < 6; i++) sum += coefficients[c][i] * f[i];
          wall[c][p] = sum;
        }
      }
    }
  };

  evaluate([0, 1, 2].map((c) => fitSurface(smooth[c], mask, width, height)));
  for (let p = 0; p < n; p++) {
    const off =
      Math.abs(wall[0][p] - smooth[0][p]) +
      Math.abs(wall[1][p] - smooth[1][p]) +
      Math.abs(wall[2][p] - smooth[2][p]);
    mask[p] = chroma[p] < NEUTRAL_CHROMA && off < 24 ? 1 : 0;
  }
  evaluate([0, 1, 2].map((c) => fitSurface(smooth[c], mask, width, height)));

  let samples = 0;
  let total = 0;
  for (let p = 0; p < n; p++) {
    if (!mask[p]) continue;
    const dr = wall[0][p] - smooth[0][p];
    const dg = wall[1][p] - smooth[1][p];
    const db = wall[2][p] - smooth[2][p];
    total += Math.sqrt(dr * dr + dg * dg + db * db);
    samples++;
  }
  console.log(`wall fit: ${samples} samples, mean error ${(total / samples).toFixed(2)}/255`);

  // Alpha: saturated, or much darker than the wall. See the header comment for
  // why it is not "different from the wall".
  const alpha = new Float64Array(n);
  for (let p = 0; p < n; p++) {
    const wallLuma = 0.2126 * wall[0][p] + 0.7152 * wall[1][p] + 0.0722 * wall[2][p];
    const gold = (chroma[p] - NEUTRAL_CHROMA) / 26;
    const charcoal = (wallLuma - luma[p] - 30) / 55;
    alpha[p] = Math.max(0, Math.min(1, Math.max(gold, charcoal)));
  }
  // A specular highlight on the gold goes briefly neutral and briefly bright,
  // which is transparent by both tests above. Closing the alpha at 3px fills
  // those pinholes without reaching across anything the artwork left open.
  const closed = morph(morph(alpha, width, height, 3, "max"), width, height, 3, "min");
  for (let p = 0; p < n; p++) alpha[p] = Math.max(alpha[p], closed[p] * 0.98);

  const rgba = Buffer.alloc(n * 4);
  for (let p = 0; p < n; p++) {
    let a = alpha[p];
    if (a > 0.97) a = 1;
    if (a < 0.02) a = 0;
    // Un-premultiply against the wall we just modelled, so a half-covered edge
    // pixel carries the ink's own colour rather than a blend of ink and wall.
    // Skipping this leaves a pale outline the moment the logo moves onto ink.
    const unmix = (value, ground) =>
      a === 0 ? 0 : Math.round(Math.max(0, Math.min(255, ground + (value - ground) / a)));
    rgba[p * 4] = unmix(raw[0][p], wall[0][p]);
    rgba[p * 4 + 1] = unmix(raw[1][p], wall[1][p]);
    rgba[p * 4 + 2] = unmix(raw[2][p], wall[2][p]);
    rgba[p * 4 + 3] = Math.round(a * 255);
  }

  return { rgba, width, height };
}

/** The wordmark repainted for dark grounds; the gold is left as drawn. */
function repaintForDark(rgba, width, height) {
  const out = Buffer.from(rgba);
  for (let p = 0; p < width * height; p++) {
    if (!rgba[p * 4 + 3]) continue;
    const [r, g, b] = [rgba[p * 4], rgba[p * 4 + 1], rgba[p * 4 + 2]];
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // The charcoal only. The gold sits at chroma 43 and up; the silver
    // highlights inside the monogram are neutral but light, hence both tests.
    if (chroma < 22 && luma < 120) {
      out[p * 4] = ON_DARK.r;
      out[p * 4 + 1] = ON_DARK.g;
      out[p * 4 + 2] = ON_DARK.b;
    }
  }
  return out;
}

/** Tightest box holding anything more than a whisper of ink. */
function contentBox(rgba, width, height, fromRow, toRow) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = fromRow; y < toRow; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] <= 8) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * The row the lockup stops being a monogram and starts being a wordmark.
 *
 * Found rather than hardcoded, so a revised lockup with different spacing still
 * splits in the right place: it is the widest fully-empty run of rows inside
 * the artwork, which for a stacked lockup is the gap under the mark.
 */
function widestGap(rgba, width, box) {
  let best = { start: box.top, length: 0 };
  let run = null;
  for (let y = box.top; y < box.top + box.height; y++) {
    let ink = 0;
    for (let x = box.left; x < box.left + box.width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > 60) ink++;
    }
    if (ink === 0) {
      run ??= y;
    } else if (run !== null) {
      if (y - run > best.length) best = { start: run, length: y - run };
      run = null;
    }
  }
  return best.start + Math.floor(best.length / 2);
}

/**
 * An .ico wrapping PNG frames.
 *
 * Next.js emits `<link rel="icon">` from app/icon.png, which every current
 * browser honours — but a bare request for /favicon.ico is still made by
 * feed readers, link unfurlers and anything reading the site without parsing
 * its head, and answering those with a 404 is a small avoidable miss.
 *
 * The container is 6 bytes of directory, 16 per frame, then the frames. PNG
 * payloads (rather than the original BMP) have been legal in .ico since
 * Windows Vista and are what every toolchain writes now.
 */
function icoContainer(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(frames.length, 4);

  let offset = 6 + frames.length * 16;
  const entries = frames.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // 0 means 256
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette size; 0 for truecolour
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}

async function main() {
  mkdirSync(BRAND, { recursive: true });

  const { rgba, width, height } = await matte();
  const onDark = repaintForDark(rgba, width, height);
  const asImage = (buffer) => sharp(buffer, { raw: { width, height, channels: 4 } });

  const lockup = contentBox(rgba, width, height, 0, height);
  const split = widestGap(rgba, width, lockup);
  const mark = contentBox(rgba, width, height, 0, split);
  console.log("lockup", lockup);
  console.log("mark  ", mark);

  const png = { compressionLevel: 9 };
  await asImage(rgba).extract(lockup).png(png).toFile(path.join(BRAND, "harbourline-lockup.png"));
  await asImage(onDark)
    .extract(lockup)
    .png(png)
    .toFile(path.join(BRAND, "harbourline-lockup-reversed.png"));
  await asImage(rgba).extract(mark).png(png).toFile(path.join(BRAND, "harbourline-mark.png"));

  /**
   * The monogram, centred on a square of ink.
   *
   * On ink rather than transparent: an icon is composited onto whatever the
   * browser, the phone's home screen or the bookmark bar is painted with, and
   * gold on an unknown ground is a coin toss. A navy tile is the same tile
   * everywhere, and it is the firm's own colour.
   *
   * The margin tightens as the square shrinks. 66% of a 512px tile leaves room
   * for the rounded-corner mask iOS applies; at 32px in a tab strip there is no
   * mask and every pixel of margin is a pixel the "H" does not get.
   */
  const iconTile = async (size) => {
    const inset = size <= 48 ? 0.86 : 0.66;
    const art = await asImage(rgba)
      .extract(mark)
      .resize({ width: Math.round(size * inset), fit: "inside" })
      .png()
      .toBuffer();
    const { width: w, height: h } = await sharp(art).metadata();
    return sharp({ create: { width: size, height: size, channels: 4, background: INK } })
      .composite([
        { input: art, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2) },
      ])
      .png(png);
  };
  // app/icon.png and app/apple-icon.png are Next.js file conventions: it emits
  // the <link> tags and the hashed URLs from their presence alone.
  await (await iconTile(512)).toFile(path.join(ROOT, "app", "icon.png"));
  await (await iconTile(180)).toFile(path.join(ROOT, "app", "apple-icon.png"));
  writeFileSync(
    path.join(ROOT, "app", "favicon.ico"),
    icoContainer(
      await Promise.all(
        [16, 32, 48].map(async (size) => ({ size, png: await (await iconTile(size)).toBuffer() })),
      ),
    ),
  );

  const card = await asImage(onDark)
    .extract(lockup)
    .resize({ width: 760, fit: "inside" })
    .png()
    .toBuffer();
  const { width: cw, height: ch } = await sharp(card).metadata();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: INK } })
    .composite([
      { input: card, left: Math.round((1200 - cw) / 2), top: Math.round((630 - ch) / 2) },
    ])
    .png(png)
    .toFile(path.join(BRAND, "harbourline-og.png"));

  console.log(
    "\nWrote public/images/brand/*.png and app/{icon,apple-icon}.png + favicon.ico.",
    "\nIf the lockup or mark box above changed, update business.logo in config/site.config.ts",
    "\nto match — next/image is told those sizes and will stretch the file to them.",
  );
}

await main();
