import { assertNoPlaceholders } from "./placeholder-guard";
import type { SiteConfig } from "@/config/schema/site.schema";

/**
 * schema.org LocalBusiness data for the homepage.
 *
 * This is what lets a search engine understand that the site belongs to a real
 * business at a real address with real opening hours, rather than inferring it
 * from prose. For a business whose customers find it by searching its town, it
 * is the difference between a plain result and a listing with hours, a phone
 * number and a map pin.
 *
 * Built from the same config that renders the page, so it cannot drift from
 * what a visitor is told — structured data that disagrees with the page is
 * worse than none, and search engines treat it as a reason for distrust.
 */

const DAY_NAMES: Record<SiteConfig["business"]["hours"][number]["day"], string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export function buildLocalBusinessSchema(
  config: SiteConfig,
  siteUrl: string,
  /**
   * Values the caller knows are invented rather than verified.
   *
   * Forwarded to `assertNoPlaceholders`. A sentinel only exists where somebody
   * was disciplined enough to leave one; a fictional firm's street, phone and
   * postcode all look like real answers, so the caller — which knows which of
   * its own values are unverified — names them instead. See
   * `config/site.config.ts::PROVISIONAL_BUSINESS_FACTS`.
   *
   * Defaulted, so existing callers behave exactly as before.
   */
  provisional: Iterable<string> = [],
) {
  const { business, seo } = config;

  // A day the business is shut is expressed by *omitting* it. Emitting an entry
  // with null times would be malformed, and emitting 00:00–00:00 would claim
  // the business is open at midnight.
  const openingHours = business.hours
    .filter((entry) => entry.opens !== null && entry.closes !== null)
    .map((entry) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_NAMES[entry.day],
      opens: entry.opens,
      closes: entry.closes,
    }));

  /**
   * The surface that motivated spec 11.
   *
   * A placeholder rendered on a page is embarrassing; a placeholder inside this
   * object is a fake business published to search engines, which outlives the
   * fix and is not something an apology undoes. Checked here rather than only
   * at build time so it holds for values that arrive from the environment.
   */
  assertNoPlaceholders(
    {
      "business.name": business.name,
      "business.phone": business.phone,
      "business.email": business.email,
      "business.address.street": business.address.street,
      "business.address.city": business.address.city,
      "business.address.zip": business.address.zip,
    },
    "config/site.config.ts",
    provisional,
  );

  return {
    "@context": "https://schema.org",
    "@type": business.schemaType,
    name: business.name,
    // Omitted entirely when a client has not set one, rather than defaulted to
    // `name`. schema.org's legalName means the registered entity, and filling
    // it with a trading name states something we do not know to be true to the
    // one consumer that checks it against a register.
    ...(business.legalName ? { legalName: business.legalName } : {}),
    description: business.description,
    url: siteUrl,
    telephone: business.phone,
    email: business.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.state,
      postalCode: business.address.zip,
      addressCountry: business.address.country,
    },
    ...(openingHours.length > 0 ? { openingHoursSpecification: openingHours } : {}),
    // Relative paths are meaningless to a crawler that fetched the JSON from
    // elsewhere, so make it absolute.
    ...(seo.ogImage ? { image: new URL(seo.ogImage, siteUrl).toString() } : {}),
  };
}

/**
 * The characters that cannot travel literally inside a script element.
 *
 * "<" is the one that matters: JSON inside a script element ends at the first
 * literal "</script>", so a config value containing one would close the tag
 * early and the remainder would be parsed as HTML. ">" and "&" are escaped
 * alongside it because they cost nothing and remove the need to reason about
 * what a lenient HTML parser does with a stray one.
 *
 * U+2028 and U+2029 earn their place for a different reason. They are valid
 * inside a JSON string but *are* JavaScript line terminators, so a config
 * value containing one yields a document JSON.parse accepts and a browser
 * refuses to parse as script — the tag breaks rather than the page being
 * attacked, but it breaks silently and only for the one visitor whose name
 * happens to contain it.
 *
 * The two separators are built from char codes rather than written literally,
 * because a literal one here would terminate whatever literal it sits inside —
 * the exact hazard this neutralises, met one level up in our own source.
 * Prettier also rewrites a unicode escape back into the raw character, so the
 * escape has to live somewhere the formatter cannot reach it.
 */
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

const SCRIPT_UNSAFE: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEPARATOR]: "\\u2028",
  [PARAGRAPH_SEPARATOR]: "\\u2029",
};

/** Built from a string, so the separators appear only as escape sequences. */
const SCRIPT_UNSAFE_PATTERN = new RegExp("[<>&\\u2028\\u2029]", "g");

/** Serialise for embedding in a <script type="application/ld+json"> tag. */
export function serialiseJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(SCRIPT_UNSAFE_PATTERN, (char) => SCRIPT_UNSAFE[char] ?? char);
}
