/**
 * Generates config/content/practice-areas/{business,individual}.ts from the two
 * markdown files in the repo root.
 *
 * The markdown is the authored source (specification.md 4.1). Forty-eight
 * services transcribed by hand is forty-eight chances to drop a key feature or
 * mistype a slug, and nothing downstream would notice a summary that silently
 * belonged to the service above. So the copy is parsed, not retyped, and the
 * parser is strict: any structural surprise throws rather than emitting
 * something plausible.
 *
 * Run: npm run content:generate
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCES = [
  { md: "BusinessToBusinessContent.md", audience: "business", out: "business.ts" },
  { md: "BusinessToCustomer.md", audience: "individual", out: "individual.ts" },
];

const OUT_DIR = join("config", "content", "practice-areas");
const NL = String.fromCharCode(10);

/** `- **key:** value`, with ` and " wrappers stripped. */
function field(block, key) {
  const prefix = "- **" + key + ":**";
  const line = block.split(NL).find((l) => l.startsWith(prefix));
  if (!line) throw new Error('missing field "' + key + '" in block:' + NL + block.slice(0, 200));
  return line
    .slice(prefix.length)
    .trim()
    .replace(/^`(.*)`$/, "$1")
    .replace(/^"(.*)"$/, "$1")
    .trim();
}

/** `**Label:** text`, up to the next blank line, unwrapped to one line. */
function paragraph(block, label) {
  const marker = "**" + label + ":**";
  const at = block.indexOf(marker);
  if (at === -1) throw new Error('missing "' + label + ':" paragraph');
  const rest = block.slice(at + marker.length);
  const end = rest.indexOf(NL + NL);
  return unwrap(end === -1 ? rest : rest.slice(0, end));
}

function unwrap(text) {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

function keyFeatures(block) {
  const m = block.match(/\*\*Key Features:\*\*\n\n((?:\d+\.[ \t].+\n?)+)/);
  if (!m) throw new Error("missing Key Features block");
  const items = m[1]
    .trim()
    .split(NL)
    .map((l) => l.replace(/^\d+\.[ \t]*/, "").trim());
  if (items.length !== 4) throw new Error("expected 4 key features, got " + items.length);
  return items;
}

function faqs(block) {
  const section = block.split(/\*\*FAQs:\*\*\n\n/)[1];
  if (!section) throw new Error("missing FAQs block");
  // Split on the numbered "**Q:**" markers; each chunk then holds one Q and one A.
  const chunks = section.split(/\n(?=\d+\.[ \t]*\*\*Q:\*\*)/).filter((c) => c.includes("**Q:**"));
  const out = chunks.map((chunk) => {
    const q = chunk.match(/\*\*Q:\*\*[ \t]*([\s\S]*?)(?=\n\s*\*\*A:\*\*)/);
    const a = chunk.match(/\*\*A:\*\*[ \t]*([\s\S]*)$/);
    if (!q || !a) throw new Error("malformed FAQ:" + NL + chunk.slice(0, 160));
    return { question: unwrap(q[1]), answer: unwrap(a[1]) };
  });
  if (out.length !== 3) throw new Error("expected 3 FAQs, got " + out.length);
  return out;
}

function parse({ md, audience }) {
  const src = readFileSync(md, "utf8");
  const body = src.replace(/^---\n[\s\S]*?\n---\n/, "");
  const blocks = body.split(/^## Category /m).slice(1);
  if (blocks.length !== 6) throw new Error(md + ": expected 6 categories, got " + blocks.length);

  return blocks.map((raw) => {
    const heading = raw.match(/^(\d+) - (.+)$/m);
    if (!heading) throw new Error(md + ": unreadable category heading");
    const [catMeta, ...serviceChunks] = raw.split(/^### /m);

    if (serviceChunks.length !== 4) {
      throw new Error(
        md + ': category "' + heading[2] + '" has ' + serviceChunks.length + " services",
      );
    }

    const services = serviceChunks.map((chunk) => {
      const h = chunk.match(/^\d+\.\d+ (.+)$/m);
      if (!h) throw new Error(md + ": unreadable service heading");
      return {
        slug: field(chunk, "slug"),
        name: h[1].trim(),
        summary: field(chunk, "summary"),
        description: paragraph(chunk, "Description"),
        keyFeatures: keyFeatures(chunk),
        jurisdictions: field(chunk, "jurisdictions")
          .split(/\s*,\s*/)
          .filter(Boolean),
        faqs: faqs(chunk),
        relatedSlugs: [],
        cta: field(chunk, "cta"),
        icon: field(chunk, "icon"),
        seo: { title: field(chunk, "seo_title"), description: field(chunk, "seo_description") },
      };
    });

    // relatedSlugs is not authored in the markdown. Siblings within the same
    // category are the honest default: they are the pages a reader on this one
    // is most likely to want next, and deriving them means they can never dangle.
    for (const service of services) {
      service.relatedSlugs = services.filter((o) => o.slug !== service.slug).map((o) => o.slug);
    }

    return {
      slug: field(catMeta, "slug"),
      audience,
      name: heading[2].trim(),
      tagline: field(catMeta, "tagline"),
      overview: paragraph(catMeta, "Overview"),
      icon: field(catMeta, "icon"),
      order: Number(field(catMeta, "order")),
      seo: { title: field(catMeta, "seo_title"), description: field(catMeta, "seo_description") },
      services,
    };
  });
}

const header = (md) =>
  [
    "// GENERATED FILE - DO NOT EDIT BY HAND.",
    "//",
    "// Source: " + md,
    "// Regenerate: npm run content:generate",
    "//",
    "// The markdown is the authored copy (specification.md 4.1). Edit it there and",
    "// re-run the generator; an edit made here is lost on the next run and, worse,",
    "// puts the published page out of step with the copy everyone reviews.",
    "",
    'import { practiceAreasSchema } from "@/config/schema/practice-area.schema";',
    "",
    "export const practiceAreas = practiceAreasSchema.parse(",
  ].join(NL);

/**
 * The icon map.
 *
 * Every icon the content names, imported explicitly, so the bundler keeps the
 * fifty-one that are used and drops the other ~1,950. The alternative,
 * lucide-react's `DynamicIcon`, is a client component that fetches each icon on
 * demand - which on a static marketing page means shipping JS and showing a
 * blank square until it lands, to solve a problem we do not have: the set of
 * icons is known at build time because it is written in the markdown.
 *
 * Generated rather than hand-maintained because it has to stay exhaustive. An
 * icon added to the markdown and forgotten here would render nothing, and a
 * missing icon is exactly the sort of absence a reviewer's eye slides over.
 */
function writeIconMap(allAreas) {
  const names = new Set();
  for (const area of allAreas) {
    names.add(area.icon);
    for (const service of area.services) names.add(service.icon);
  }

  const sorted = [...names].sort();
  const pascal = (name) =>
    name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

  const lines = [
    "// GENERATED FILE - DO NOT EDIT BY HAND.",
    "//",
    "// Regenerate: npm run content:generate",
    "//",
    "// Every lucide icon named by the practice-area content, imported explicitly so",
    "// the bundler can drop the ~1,950 that are not used. See the generator for why",
    "// this is not lucide-react's DynamicIcon.",
    "",
    'import type { LucideIcon } from "lucide-react";',
    "import {",
    ...sorted.map((name) => "  " + pascal(name) + ","),
    '} from "lucide-react";',
    "",
    "export const PRACTICE_AREA_ICONS: Record<string, LucideIcon> = {",
    ...sorted.map((name) => '  "' + name + '": ' + pascal(name) + ","),
    "};",
    "",
  ];

  writeFileSync(join(OUT_DIR, "icon-map.ts"), lines.join(NL), "utf8");
  console.log("icon-map.ts: " + sorted.length + " distinct icons");
}

mkdirSync(OUT_DIR, { recursive: true });

const generated = [];

for (const source of SOURCES) {
  const areas = parse(source);
  const file = header(source.md) + NL + JSON.stringify(areas, null, 2) + NL + ");" + NL;
  writeFileSync(join(OUT_DIR, source.out), file, "utf8");
  const count = areas.reduce((n, a) => n + a.services.length, 0);
  console.log(source.out + ": " + areas.length + " categories, " + count + " services");
  generated.push(...areas);
}

writeIconMap(generated);
