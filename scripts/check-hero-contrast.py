"""Measure every text run in the homepage hero against the photograph behind it.

    npm run check:hero-contrast          (dev server must already be running)

Exits non-zero if any run falls below its WCAG 1.4.3 threshold.

## Why this is a script and not a unit test

The hero sets text over photographs. Nothing in the component tells you whether
that text is readable, because the answer depends on pixels that only exist once
a real browser has composited three scrim layers over a JPEG. axe cannot help:
faced with text over an image it reports `incomplete`, not a violation, so the
site's 0-violation audit has always been silent about the one place on it where
contrast is genuinely at risk.

Every number in `components/blocks/firm-hero.tsx` came from this measurement.
Re-run it after changing the scrim, the hero copy, or the photographs.

## Three traps, all of which produced confidently wrong numbers first

1. **Sampling a frame with the text visible measures glyph antialiasing**, not
   the backdrop. The tell is that every photograph returns nearly the same
   number. So the boxes are recorded, the text is hidden, the frame is
   re-captured, and only then sampled — taking the LIGHTEST pixel in each box,
   which is the worst case for light text.
2. **Tailwind v4 emits opacity modifiers as `color(srgb ...)`, whose channels
   run 0..1.** Parsing those with a number regex reads 0.93 as 0.93/255 and
   reports ~1.0:1 for text that is perfectly legible. The browser composites the
   colour over the sampled pixel through a 1x1 canvas instead.
3. **The chat launcher floats over the hero's bottom-right corner on a phone**,
   and its white glyph is not a backdrop. It reported the third statistic at
   1.08:1 against paper. It is hidden for the capture.

## It reports what the scrim costs, as well as what it buys

A scrim dense enough to pass every check trivially is one that has hidden the
photograph it covers — which is the failure this file exists to stop someone
"fixing" their way into. So the summary also prints the mean luminance of the
hero and of its brightest 5%. Those are not pass/fail; they are the other half
of the trade, and they are why the passing margins here are thin on purpose.

## Dependencies

`playwright` and `pillow`, neither of which is an npm package:

    pip install playwright pillow && playwright install chromium
"""

import re
import sys

from playwright.sync_api import sync_playwright
from PIL import Image

BASE = "http://localhost:3000"
VIEWPORTS = [(1280, 900, "desktop"), (390, 844, "mobile")]

# A floor, not an exact count: the three `detail` runs are `hidden sm:block` and
# genuinely absent on mobile. Anything below this means a selector stopped
# matching rather than an element legitimately not rendering.
EXPECTED_RUNS = 10

CONFIG = "config/site.config.ts"


def hero_images():
    """The photographs, read from `business.heroImages` in the site config.

    Read from the config rather than from the rendered DOM, which was the first
    attempt and quietly measured one image instead of three: `HeroSlideshow`
    defers mounting every frame after the first, so at `networkidle` the later
    ones are not in the document yet. A check that silently narrows its own
    coverage is worse than one that fails loudly.
    """
    source = open(CONFIG, encoding="utf-8").read()
    block = re.search(r"heroImages:\s*\[(.*?)\]", source, re.S)
    return re.findall(r'"([^"]+)"', block.group(1)) if block else []

# Every text run in the section, named for the report. The first pass measured
# only the eyebrow and the h1, which is how the lead sat at 4.16:1 over the
# bridge photograph from the day the photography landed until it was caught.
COLLECT = """() => {
  const section = document.querySelector('main section');
  const runs = [];
  const add = (el, name) => {
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;   // `hidden sm:block` details
    const style = getComputedStyle(el);
    runs.push({
      name,
      box: [Math.round(box.x), Math.round(box.y), Math.round(box.right), Math.round(box.bottom)],
      color: style.color,
      size: parseFloat(style.fontSize),
      weight: style.fontWeight,
    });
  };

  const h1 = section.querySelector('h1');
  add(h1, 'h1');
  // A differently-coloured child of the h1, so measuring the h1 alone would
  // miss it entirely — the exact shape of the gap this script exists to close.
  // Brass is the tightest colour on the site, and the horizontal scrim is
  // deliberately transparent on the right, which is where a long word reaches.
  add(h1.querySelector('[data-rotating-word]'), 'rotatingWord');

  // By name, not by position. These were `h1.previousElementSibling` and
  // `h1.nextElementSibling` until each moved into its own Reveal wrapper — at
  // which point the script stopped measuring the eyebrow and the lead and said
  // nothing, reporting a clean run over two fewer text runs than before. A
  // check that quietly narrows its own coverage is worse than one that fails.
  for (const name of ['eyebrow', 'lead', 'location']) {
    add(section.querySelector(`[data-hero-run="${name}"]`), name);
  }
  section.querySelectorAll('dt').forEach((el, i) => add(el, `label${i}`));
  section.querySelectorAll('dd').forEach((el, i) => add(el, (i % 2 ? 'detail' : 'value') + (i >> 1)));
  return runs;
}"""

# One frame at a time: the slideshow crossfades, so without pinning, which
# photograph is being measured depends on when the screenshot landed.
PIN_IMAGE = """(src) => {
  document.querySelectorAll('main section img').forEach((img) => {
    img.removeAttribute('srcset');
    img.src = src;
    img.closest('div').style.opacity = '1';
  });
}"""

HIDE_TEXT = """() => {
  // Links as well as text: the two CTAs have solid light backgrounds, and
  // leaving them in skews the visibility figure below toward "the photograph is
  // fine, look how bright this is".
  document.querySelector('main section')
    .querySelectorAll('p,h1,dt,dd,a').forEach((el) => { el.style.visibility = 'hidden'; });
  const chat = document.querySelector('button[aria-label="Chat with us"]');
  if (chat) chat.style.visibility = 'hidden';
}"""

# Trap 2: let the browser composite, rather than parsing a colour string.
COMPOSITE = """(pairs) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return pairs.map(([color, bg]) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  });
}"""

SECTION_BOX = """() => {
  const b = document.querySelector('main section').getBoundingClientRect();
  return [Math.round(b.x), Math.round(b.y), Math.round(b.right), Math.round(b.bottom)];
}"""


def luminance(rgb):
    def channel(value):
        value /= 255
        return value / 12.92 if value <= 0.03928 else ((value + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    lo, hi = sorted((luminance(a), luminance(b)))
    return (hi + 0.05) / (lo + 0.05)


def threshold(run):
    """WCAG 1.4.3: 3:1 for large text, 4.5:1 otherwise."""
    large = run["size"] >= 24 or (run["size"] >= 18.66 and int(run["weight"]) >= 700)
    return 3.0 if large else 4.5


def main():
    worst = {}
    visibility = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            images = hero_images()
            if not images:
                sys.exit(f"No heroImages found in {CONFIG} — the hero is text-only.")

            for width, height, label in VIEWPORTS:
                for src in images:
                    name = src.rsplit("/", 1)[-1]
                    page = browser.new_page(viewport={"width": width, "height": height})
                    page.goto(BASE, wait_until="networkidle")
                    page.evaluate(PIN_IMAGE, src)
                    page.wait_for_timeout(1600)

                    runs = page.evaluate(COLLECT)
                    if len(runs) < EXPECTED_RUNS:
                        sys.exit(
                            f"Only {len(runs)} text runs found, expected at least "
                            f"{EXPECTED_RUNS}. A wrapper probably moved and a selector "
                            "in COLLECT no longer matches — fix it rather than lowering "
                            "the number, or the check silently covers less than it claims."
                        )
                    if not runs:
                        sys.exit("No text runs found — is the hero rendering with photographs?")

                    page.evaluate(HIDE_TEXT)
                    page.wait_for_timeout(250)
                    shot = page.screenshot()
                    import io

                    frame = Image.open(io.BytesIO(shot)).convert("RGB")

                    backgrounds = []
                    for run in runs:
                        x0, y0, x1, y1 = run["box"]
                        patch = frame.crop(
                            (max(0, x0), max(0, y0), min(frame.width, x1), min(frame.height, y1))
                        )
                        # Lightest pixel: the worst case for the light text the
                        # hero uses throughout.
                        backgrounds.append(max(patch.getdata(), key=luminance))

                    foregrounds = page.evaluate(
                        COMPOSITE, [[r["color"], list(bg)] for r, bg in zip(runs, backgrounds)]
                    )

                    for run, bg, fg in zip(runs, backgrounds, foregrounds):
                        ratio = contrast(fg, bg)
                        key = run["name"]
                        if key not in worst or ratio < worst[key][0]:
                            worst[key] = (ratio, f"{label}/{name}", run, tuple(bg), tuple(fg))

                    left, top, right, bottom = page.evaluate(SECTION_BOX)
                    hero = frame.crop(
                        (
                            max(0, left),
                            max(0, top),
                            min(frame.width, right),
                            min(frame.height, bottom),
                        )
                    )
                    pixels = sorted(hero.getdata(), key=luminance)
                    brightest = pixels[-max(1, len(pixels) // 20) :]
                    visibility.append(
                        (
                            label,
                            name,
                            sum(luminance(p) for p in pixels) / len(pixels),
                            sum(luminance(p) for p in brightest) / len(brightest),
                        )
                    )
                    page.close()
        finally:
            browser.close()

    print(f"{'run':9s} {'worst':>6s} {'bar':>5s}  {'where':34s} {'size':>5s}  background -> text")
    failures = 0
    for key, (ratio, where, run, bg, fg) in sorted(worst.items()):
        bar = threshold(run)
        ok = ratio >= bar
        failures += 0 if ok else 1
        flag = "" if ok else "   <-- FAIL"
        print(
            f"{key:9s} {ratio:6.2f} {bar:5.1f}  {where:34s} "
            f"{round(run['size']):3d}px  {bg} -> {fg}{flag}"
        )

    print("\nphotograph visibility — not pass/fail, the other half of the trade")
    for label, name, mean, top in visibility:
        print(f"  {label:8s} {name:30s} mean {mean:.3f}   brightest 5% {top:.3f}")

    print(f"\nFAILURES: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
