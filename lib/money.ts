import { siteConfig } from "@/config/site.config";

/**
 * Money formatting, in one place.
 *
 * Before this existed, prices were rendered with a template string —
 * `From $${service.priceFrom}` in services-grid.tsx — which is fine for one
 * number on a marketing card and hopeless for anything that adds up. A total
 * with tax and a delivery fee cannot be built on it, and neither can a
 * currency that is not the dollar.
 *
 * ## Minor units, always
 *
 * Every amount that crosses this module is an integer number of minor units:
 * cents, pence. Never a float. `0.1 + 0.2 !== 0.3`, and an order total that is
 * a cent out is a receipt nobody can reconcile against the card statement.
 * Stripe takes minor units for the same reason.
 *
 * ## The locale is pinned, for the same reason lib/format.ts pins its own
 *
 * An unpinned `toLocaleString()` resolves against Node's ICU default on the
 * server and the browser's locale on the client. Those silently differ, which
 * renders one string during SSR and a different one during hydration — a
 * hydration mismatch whose cause is invisible in the diff. That bug already
 * happened once here with dates; this is the same trap with money.
 *
 * en-CA renders CAD as "$32.00" and USD as "US$32.00", which is the right
 * emphasis for a Canadian business: its own currency reads plainly and a
 * foreign one is marked. A business in another market changes this constant.
 */
const MONEY_LOCALE = "en-CA";

export type Currency = (typeof siteConfig)["business"]["currency"];

/**
 * Format an integer number of minor units for display.
 *
 * @param minorUnits e.g. 3250 for $32.50. Must be an integer.
 */
export function formatMoney(
  minorUnits: number,
  currency: Currency = siteConfig.business.currency,
): string {
  if (!Number.isInteger(minorUnits)) {
    // Loud rather than silently rounding: a non-integer here means someone
    // passed dollars where cents were expected, and the difference between
    // $32.50 and $0.325 is the kind of error that reaches a customer.
    throw new TypeError(`formatMoney expects integer minor units, received ${minorUnits}`);
  }

  return new Intl.NumberFormat(MONEY_LOCALE, {
    style: "currency",
    currency,
  }).format(minorUnits / 100);
}

/**
 * Format an amount given in major units — whole dollars.
 *
 * Exists because `Service.priceFrom` in config/content/services.ts is written
 * in dollars while `Service.depositAmount` is in cents, which is a wart in the
 * content schema rather than something this module should pretend away. Use
 * `formatMoney` for anything computed; this is for that one config field.
 */
export function formatMajorUnits(
  majorUnits: number,
  currency: Currency = siteConfig.business.currency,
): string {
  return formatMoney(Math.round(majorUnits * 100), currency);
}

/**
 * The currency code Stripe wants: lower-case ISO 4217.
 *
 * Stripe accepts only lower case, and passing "CAD" is a 400 at the till
 * rather than a type error at build time — which is exactly the sort of
 * failure that gets discovered by a customer.
 */
export function stripeCurrency(currency: Currency = siteConfig.business.currency): string {
  return currency.toLowerCase();
}
