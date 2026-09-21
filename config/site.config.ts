import { siteConfigSchema } from "./schema/site.schema";

/**
 * Harbourline Law Group LLP — a FICTIONAL firm, for a design demonstration.
 *
 * Every business fact below is invented. `lib/structured-data.ts` receives them
 * through `buildLocalBusinessSchema`'s `provisional` argument (see
 * `PROVISIONAL_BUSINESS_FACTS` at the foot of this file), so a genuine public
 * production deploy throws rather than publishing a firm that does not exist to
 * search engines. `app/robots.ts` also disallows everything. Both safeguards are
 * deliberate — see specification.md 1.3 before touching either.
 */
export const siteConfig = siteConfigSchema.parse({
  business: {
    name: "Harbourline Law Group",
    legalName: "Harbourline Law Group LLP",
    shortName: "Harbourline",
    /**
     * Four client types, two from each half of the firm.
     *
     * Every one is a person rather than an abstraction, which is the point: the
     * site forks immediately into "for business" and "for individuals", and the
     * headline is where a visitor first learns that both halves are meant for
     * them. "employers" is the widest, so it is what sets the reserved width.
     *
     * Facts about who the firm acts for, not claims about outcomes — the same
     * rule the rest of the copy follows (specification.md 1.3).
     */
    heroHeadline: {
      lead: "Cross-border counsel for",
      rotating: ["founders", "families", "employers", "newcomers"],
    },
    /**
     * The firm's logo, cut out of the flat artwork it was supplied as.
     *
     * The original is a presentation render — the lockup photographed on a grey
     * wall, complete with a vignette and a soft drop shadow — and is kept at
     * `design/harbourline-logo-source.jpeg`, outside /public so it is not
     * served. `scripts/extract-logo.mjs` derives every file below from it, so
     * the next revision of the artwork is one command rather than an afternoon.
     *
     * Sizes are the exported pixel dimensions and must match the files; see
     * logoSchema in config/schema/site.schema.ts for why they live here.
     */
    logo: {
      mark: { src: "/images/brand/harbourline-mark.png", width: 394, height: 222 },
      lockup: { src: "/images/brand/harbourline-lockup.png", width: 579, height: 363 },
      lockupOnDark: {
        src: "/images/brand/harbourline-lockup-reversed.png",
        width: 579,
        height: 363,
      },
    },
    //tagline: "Counsel that crosses the border with you",
    tagline: "Premier Legal Counsel for North American & Global Markets.",
    description:
      "Harbourline Law Group is a cross-border firm advising businesses and individuals on both sides of the Canada-US border. Corporate, intellectual property, employment, real estate, privacy and litigation matters for companies; injury, family, estate, criminal, property and immigration matters for individuals — handled as one file from Toronto and New York.",
    phone: "(416) 555-0148",
    /**
     * The WhatsApp line, shown in the mobile action bar.
     *
     * This is the firm's own invented number, so the link opens a chat with a
     * number that does not exist — the same class of provisional fact as the
     * address and the phone, and listed in PROVISIONAL_BUSINESS_FACTS below for
     * the same reason. Replace it with a real number and the button starts
     * working; there is nothing else to change.
     */
    whatsapp: "(416) 555-0148",
    email: "hello@harbourline.example",
    // "Attorney" rather than the generic LocalBusiness: the specific subtypes
    // earn richer treatment in local search. Already an allowed value in
    // config/schema/site.schema.ts.
    schemaType: "Attorney",
    /**
     * Four photographs, crossfading. Order matters — the first is the LCP
     * element and the only one loaded eagerly.
     *
     * The boardroom leads at the client's request. Its upper-left quadrant is
     * unlit ceiling, so the headline has clean air behind it, and after grading
     * it sits at the palette's own dusk. Toronto, which used to lead for the
     * same reason, is third.
     *
     * Every file here is output. They are graded from `design/hero-source/` by
     * `npm run hero:grade` to a common 99th-percentile copy-zone luminance —
     * the two newest arrived at 0.92 and 0.96 and were roughly halved to reach
     * it. Do not hand-edit them, and re-run `npm run check:hero-contrast` after
     * any change here: fewer or brighter frames move every text run in the hero.
     *
     * `classical-colonnade-night` was dropped from this list, and it is worth
     * knowing why before anyone adds it back. One frame set the exposure
     * ceiling for the whole rotation: its lit stone columns reach 0.69 while
     * the frame averages 0.095, so it failed first at every grading target and
     * held the other three down with it. It was also the least visible of the
     * five once composited. Removing it let `TARGET_LUMA` go 0.20 -> 0.24, which
     * made every remaining frame about 30% brighter *and* widened every contrast
     * margin. Its source is in `design/hero-retired/`.
     *
     * Two standing rules this list is measured against, both in CLAUDE.md's
     * onboarding checklist:
     *
     * - **Architecture, not people.** A stock portrait captioned into an
     *   invented firm's homepage is a claim about whoever is in it; a skyline
     *   is not. `colonnade-professionals-day` breaks this rule deliberately, on
     *   the client's instruction — see image-credits.ts, where its provenance
     *   is also still open.
     * - **No third-party signage.** The uncropped Toronto panorama carries a
     *   readable bank logo and is cropped to exclude it, because a real
     *   company's sign on this firm's homepage reads as a claim about its
     *   premises. The two newest frames carry no legible signage, but both show
     *   Sydney Harbour — the Opera House and the Harbour Bridge are
     *   identifiable in each — against a firm whose offices are Toronto and
     *   New York.
     *
     * Credited in config/content/image-credits.ts.
     */
    heroImages: [
      "/images/hero/boardroom-scales-harbour.jpg",
      "/images/hero/colonnade-professionals-day.jpg",
      "/images/hero/toronto-skyline-blue-hour.jpg",
      "/images/hero/brooklyn-bridge-dusk.jpg",
    ],
    timezone: "America/Toronto",
    currency: "CAD",
    address: {
      street: "150 King Street West, Suite 2200",
      city: "Toronto",
      state: "ON",
      zip: "M5H 1J9",
      country: "CA",
    },
    // Law-firm hours, not retail. Deliberately closed at the weekend; the
    // consultation booking flow is how someone reaches the firm out of hours.
    hours: [
      { day: "mon", opens: "08:30", closes: "18:00" },
      { day: "tue", opens: "08:30", closes: "18:00" },
      { day: "wed", opens: "08:30", closes: "18:00" },
      { day: "thu", opens: "08:30", closes: "18:00" },
      { day: "fri", opens: "08:30", closes: "17:00" },
      { day: "sat", opens: null, closes: null },
      { day: "sun", opens: null, closes: null },
    ],
  },
  /**
   * Real routes, not the kit's in-page anchors.
   *
   * The two audiences come first and in that order because the whole site is
   * built around that fork — a visitor who cannot tell within one glance which
   * half is theirs has already been lost. `site-header.tsx::resolveHref` still
   * rewrites any remaining `#anchor` to `/#anchor`, so the home page's own
   * sections keep working from a sub-route.
   */
  nav: [
    { label: "For Business", href: "/business" },
    { label: "For Individuals", href: "/individuals" },
    { label: "Attorneys", href: "/attorneys" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  seo: {
    defaultTitle: "Harbourline Law Group | Cross-Border Counsel, Canada and the US",
    defaultDescription:
      "Cross-border legal counsel for businesses and individuals in Canada and the United States. Offices in Toronto and New York.",
    /**
     * The share card: the reversed lockup on the ink band, 1200x630.
     *
     * Deliberately just the logo. A share card is read at thumbnail size in a
     * message list, where a headline set over it is a grey ribbon; and the one
     * thing worth carrying at that size is who this is from.
     */
    ogImage: "/images/brand/harbourline-og.png",
  },
});

/**
 * `business.whatsapp` as a wa.me link, or null when it cannot be one.
 *
 * Here rather than in `lib/`, and that is deliberate: `lib/` is shared,
 * non-diverging code, and a link format for one client's contact preference is
 * not a behavioural rule the next client inherits.
 *
 * wa.me wants digits only, with a country code and no punctuation — a `+`, a
 * space or a bracket produces a page that says the number is invalid rather
 * than an error anyone sees at build time. North American numbers are ten
 * digits and the country code is 1, so both shapes are accepted and normalised.
 *
 * **An unexpected shape returns null rather than a guess.** The column then
 * drops out of the bar, which is the honest failure: a link that opens a chat
 * with the wrong person is worse than no link, and "no WhatsApp button" is
 * visible to whoever configured it in a way that a silently-wrong number is not.
 */
export const whatsappUrl: string | null = (() => {
  const raw = siteConfig.business.whatsapp;
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `https://wa.me/1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `https://wa.me/${digits}`;

  return null;
})();

/**
 * The invented facts, named so the structured-data layer can refuse to publish
 * them.
 *
 * `lib/placeholder-guard.ts` catches a field that still says REPLACE_WITH or is
 * blank. It structurally cannot catch a plausible invention — a street, a phone
 * number and a postcode that all look like answers — which is exactly what this
 * file contains. `assertNoPlaceholders` takes a `provisional` list for that
 * case: the caller knows which of its own values are unverified, so it says so.
 *
 * Replacing the firm with a real one means emptying this array in the same
 * commit that fills in the real details. Until then a public deploy fails loudly,
 * which is the intended behaviour for a demo, not an obstacle to work around.
 */
export const PROVISIONAL_BUSINESS_FACTS: string[] = [
  siteConfig.business.name,
  // `legalName` is optional in the schema, so it narrows to string | undefined.
  // Filtered rather than asserted: the guard compares trimmed strings, and an
  // undefined slipping in would silently match nothing.
  siteConfig.business.legalName,
  siteConfig.business.phone,
  siteConfig.business.whatsapp,
  siteConfig.business.email,
  siteConfig.business.address.street,
  siteConfig.business.address.zip,
].filter((value): value is string => typeof value === "string");
