import { z } from "zod";

export const navLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type NavLink = z.infer<typeof navLinkSchema>;

export const businessHoursSchema = z.object({
  day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  opens: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  closes: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
});
export type BusinessHours = z.infer<typeof businessHoursSchema>;

/**
 * One logo file, with the intrinsic size it was exported at.
 *
 * The dimensions are part of the config rather than looked up, because
 * `next/image` needs them at render time and a logo reached by a config string
 * cannot be statically imported. Getting them wrong is not a crash — the image
 * renders at the wrong aspect ratio and the header quietly looks stretched — so
 * they are written down next to the path they belong to.
 */
export const logoAssetSchema = z.object({
  /** Path under /public. */
  src: z.string().min(1),
  width: z.int().positive(),
  height: z.int().positive(),
});
export type LogoAsset = z.infer<typeof logoAssetSchema>;

/**
 * A client's logo, in the two shapes a site actually needs.
 *
 * Two, not one. A full lockup shrunk to fit a 64px header row renders its
 * wordmark at about four pixels of cap height, which is a smudge; a bare
 * monogram in the footer leaves the firm unnamed on the one part of the page
 * that exists to name it. So the header takes the mark and sets the name in
 * live type beside it, and the footer takes the lockup.
 *
 * `lockupOnDark` exists because this is not a symmetry: a wordmark drawn in
 * charcoal disappears against the ink band, and recolouring it in CSS is not
 * possible for a raster. Optional, because a logo that is legible on both
 * grounds needs only the one file.
 *
 * The whole block is optional: a repo with no logo yet renders the firm's name
 * as type, which is what every clone starts as and is not a broken state.
 */
export const logoSchema = z.object({
  /** Monogram only. The header, and the app icons. */
  mark: logoAssetSchema,
  /** Mark and wordmark together. The footer, and the share card. */
  lockup: logoAssetSchema,
  /** The lockup with its wordmark repainted for dark grounds. */
  lockupOnDark: logoAssetSchema.optional(),
});
export type Logo = z.infer<typeof logoSchema>;

export const siteConfigSchema = z.object({
  business: z.object({
    name: z.string().min(1),
    /**
     * The registered company name, where it differs from the trading name.
     *
     * Optional, because most clients have only one and repeating it would be
     * noise. Where they differ, the trading name is what appears on the page
     * and this one goes in the JSON-LD's `legalName` — the field a search
     * engine reconciles against a business registry, which is why guessing it
     * from the trading name would be worse than omitting it.
     */
    legalName: z.string().min(1).optional(),
    /**
     * The name at its shortest, for the phone header.
     *
     * A sticky header on a 390px screen has about 200px for the brand once the
     * call link and the menu toggle have taken theirs, and "Harbourline Law
     * Group" beside a monogram needs 235. It wrapped to two lines — "Harbourline
     * Law / Group" — which both broke the name in the wrong place and made the
     * header 12px taller on every scroll of every page.
     *
     * Optional, and it falls back to `name`, so a client whose name already fits
     * sets nothing. Only the header uses it: the footer, the title tag and the
     * JSON-LD all want the real name.
     */
    shortName: z.string().min(1).optional(),
    /**
     * The homepage headline, with one word in it that cycles.
     *
     * Split into a fixed lead and a list rather than one string with a
     * placeholder in it, because the two halves are typographically different
     * things: the lead is set in the headline's own colour and the rotating
     * word is set in brass, and only the second needs a reserved width.
     *
     * At least two words, since one would render a cycling element that never
     * cycles — an animation primitive quietly doing nothing is worse than not
     * using it. Optional as a whole: omitted, the hero falls back to `tagline`
     * exactly as it did before, which is the state every fresh clone is in.
     */
    heroHeadline: z
      .object({
        /** The part that does not change — "Cross-border counsel for". */
        lead: z.string().min(1),
        /** The words that cycle through the slot after it. */
        rotating: z.array(z.string().min(1)).min(2),
      })
      .optional(),
    /** See logoSchema. Omitted → the name is set in type, as before. */
    logo: logoSchema.optional(),
    tagline: z.string().min(1),
    description: z.string().min(1),
    phone: z.string().min(1),
    /**
     * The number that receives WhatsApp messages, if the firm takes them.
     *
     * Separate from `phone` because they are often not the same line — a firm
     * may publish a switchboard and answer WhatsApp on a mobile. Stored as a
     * plain number in whatever shape reads well; `whatsappUrl` in
     * config/site.config.ts derives the `wa.me` link, and returns null rather
     * than guessing when it cannot parse one.
     *
     * Optional: omitted, `MobileActionBar` drops the column instead of
     * publishing a link that opens a chat with nobody.
     */
    whatsapp: z.string().min(1).optional(),
    email: z.email(),
    address: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zip: z.string().min(1),
      country: z.string().min(1),
    }),
    hours: z.array(businessHoursSchema),
    // Optional hero image, as a path under /public (e.g.
    // "/images/hero/hero-1.jpg"). Omitted → Hero renders text-only in a
    // single column, exactly as it did before images were supported.
    /**
     * Hero photographs, as paths under /public.
     *
     * A list rather than one path, because HeroCinematic crossfades between
     * them. One entry behaves exactly as a single image does; an empty list
     * renders the hero text-only, which is the state every new clone starts in.
     *
     * **This is client-supplied input, and the checklist asks for it at
     * intake.** It is the largest visual decision on the site and the hardest
     * thing to substitute for later. See "Hero photography" in CLAUDE.md.
     *
     * Defaulted, so a client repo that has not merged this keeps parsing.
     */
    heroImages: z.array(z.string().min(1)).default([]),
    /**
     * Single-image form, read only when `heroImages` is empty.
     *
     * Kept so a client repo that set `heroImage` before the list existed still
     * renders its photograph after merging this down.
     */
    heroImage: z.string().min(1).optional(),
    /**
     * schema.org type for the structured data at the top of the page.
     *
     * A closed set because a typo here does not break anything visibly — it
     * just quietly stops Google recognising the business, which is the whole
     * point of emitting it. LocalBusiness is the safe general answer; the
     * subtypes earn richer treatment in local results, so use the specific one
     * when it fits. Extend the list rather than passing an arbitrary string.
     */
    schemaType: z
      .enum([
        "LocalBusiness",
        "Dentist",
        "MedicalClinic",
        "LegalService",
        "Attorney",
        "HealthClub",
        "BeautySalon",
        "HairSalon",
        "Restaurant",
        "GeneralContractor",
        "HomeAndConstructionBusiness",
        "ProfessionalService",
      ])
      .default("LocalBusiness"),
    // IANA zone for the practice itself. Appointment times are formatted on
    // the server, where the runtime clock is the deployment's rather than the
    // visitor's — without this, "Thursday 9:20" could render as whatever
    // Vercel's region thinks it is. Defaulted so existing client configs keep
    // parsing when this is merged in from upstream.
    timezone: z.string().min(1).default("UTC"),
    /**
     * ISO 4217 currency this business charges in.
     *
     * A closed set rather than a free string: a typo here does not fail
     * visibly, it just makes Stripe reject the charge at the till, and it
     * makes every price on the site render in the wrong denomination.
     *
     * Defaults to CAD, which is a deliberate choice rather than a neutral
     * one. Stripe's currency was previously the literal "usd" in
     * submit-booking.ts, so every deployment charged US dollars — including
     * two Ontario clients. Defaulting to CAD fixes both on merge instead of
     * leaving them wrong until someone remembers. A business anywhere else
     * sets this explicitly, and the onboarding checklist says so.
     *
     * This is read on the server and never from a request. The security
     * review recorded the old literal as what stopped a client-supplied
     * value reaching a PaymentIntent; making it configurable must not
     * weaken that.
     */
    currency: z.enum(["CAD", "USD", "GBP", "EUR", "AUD", "NZD"]).default("CAD"),
  }),
  nav: z.array(navLinkSchema).min(1),
  seo: z.object({
    defaultTitle: z.string().min(1),
    defaultDescription: z.string().min(1),
    ogImage: z.string().min(1).optional(),
  }),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
