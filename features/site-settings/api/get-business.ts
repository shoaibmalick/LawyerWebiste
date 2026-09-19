import { cache } from "react";
import { businessHoursSchema, type SiteConfig } from "@/config/schema/site.schema";
import { siteConfig } from "@/config/site.config";
import { siteSettingsService } from "@/server/services/siteSettingsService";

/**
 * The business's contact details, with any dashboard overrides applied.
 *
 * **Returns the same shape `siteConfig.business` already has**, which is what
 * keeps this change small: every component taking a `business` prop — the
 * hero, the header, the footer, the contact blocks — is untouched. Only the
 * pages that supply that prop had to change, from reading the config directly
 * to awaiting this.
 *
 * **Deliberately does not call `connection()`**, unlike `getActiveTheme`. It
 * would make this unusable everywhere except a render — route handlers and
 * Server Actions both read the business now (the notification recipient, the
 * phone number in every booking email), and `connection()` throws outside a
 * request scope. It is also unnecessary: `getActiveTheme` runs in the root
 * layout and calls it there, so every route under that layout is already
 * per-request. See the "Nothing is cached, deliberately" note in CLAUDE.md.
 *
 * Null columns mean "not overridden", so an untouched deployment returns the
 * configured values unchanged and byte-for-byte. A database that cannot be
 * reached returns them too, rather than failing the render: a business with a
 * temporarily unreachable database should still show a phone number somebody
 * can ring.
 */
/**
 * Memoised per request.
 *
 * The root layout reads this on every page, and the homepage, /contact and
 * /consultation each read it again for their own copy - two round trips to a
 * remote Neon for one row that cannot change mid-request. `cache` dedupes
 * within the request and nothing beyond it, so a change saved at
 * /dashboard/settings still shows on the very next request.
 */
export const getBusiness = cache(async function getBusiness(): Promise<SiteConfig["business"]> {
  try {
    const settings = await siteSettingsService.getSettings();

    return {
      ...siteConfig.business,
      phone: settings.businessPhone ?? siteConfig.business.phone,
      email: settings.businessEmail ?? siteConfig.business.email,
      address: {
        street: settings.addressStreet ?? siteConfig.business.address.street,
        city: settings.addressCity ?? siteConfig.business.address.city,
        state: settings.addressState ?? siteConfig.business.address.state,
        zip: settings.addressZip ?? siteConfig.business.address.zip,
        country: settings.addressCountry ?? siteConfig.business.address.country,
      },
      hours: parseHours(settings.openingHours) ?? siteConfig.business.hours,
    };
  } catch (error) {
    console.error("[business] could not read contact overrides; using config", error);
    return siteConfig.business;
  }
});

/**
 * Validate the stored week on the way *out*, not only on the way in.
 *
 * A Json column holds whatever was last written to it, and "whatever was last
 * written" includes rows from a schema that has since changed, or from a hand
 * edit in a database client. Re-parsing means a malformed week falls back to
 * config rather than reaching `summariseOpeningHours` or the JSON-LD builder as
 * an unexpected shape — both of which would render the fault as a broken page
 * rather than as a wrong opening time.
 */
function parseHours(value: unknown): SiteConfig["business"]["hours"] | null {
  if (value === null || value === undefined) return null;

  const parsed = businessHoursSchema.array().safeParse(value);
  if (!parsed.success) {
    console.error("[business] stored opening hours are malformed; using config");
    return null;
  }

  return parsed.data;
}
