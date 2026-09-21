import { describe, expect, it } from "vitest";
import { siteConfig, whatsappUrl } from "@/config/site.config";

/**
 * The wa.me link behind the mobile action bar's WhatsApp button.
 *
 * Worth a test because every failure mode here is silent. wa.me does not error
 * on a malformed number — it serves a page saying the number is invalid, to the
 * visitor, on their phone, after they have already decided to make contact.
 * Nothing in a build, a lint or a render would have told anyone.
 *
 * The parsing logic itself lives in `config/site.config.ts` rather than `lib/`,
 * because a link format for one client's contact preference is that client's
 * config, not a behavioural rule the next client inherits.
 */

/** Re-implements the helper so the cases can be exercised on arbitrary input. */
function toWhatsAppUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `https://wa.me/1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `https://wa.me/${digits}`;
  return null;
}

describe("whatsappUrl", () => {
  it("strips the punctuation a human types", () => {
    // The config holds "(416) 555-0148" because that is what reads well beside
    // the other contact details. wa.me accepts digits only.
    expect(toWhatsAppUrl("(416) 555-0148")).toBe("https://wa.me/14165550148");
  });

  it("adds the country code to a ten-digit number", () => {
    expect(toWhatsAppUrl("4165550148")).toBe("https://wa.me/14165550148");
  });

  it("keeps a country code that is already there", () => {
    expect(toWhatsAppUrl("+1 416 555 0148")).toBe("https://wa.me/14165550148");
    expect(toWhatsAppUrl("1-416-555-0148")).toBe("https://wa.me/14165550148");
  });

  it("returns null rather than guessing at a shape it does not know", () => {
    // A UK or Indian number is not wrong, it is just not something this
    // ten-or-eleven-digit rule can place a country code on. Dropping the column
    // is visible to whoever configured it; a link to the wrong person is not.
    expect(toWhatsAppUrl("+44 20 7946 0958")).toBeNull();
    expect(toWhatsAppUrl("555-0148")).toBeNull();
    expect(toWhatsAppUrl("not a number")).toBeNull();
  });

  it("treats an unset number as no button", () => {
    expect(toWhatsAppUrl(undefined)).toBeNull();
    expect(toWhatsAppUrl("")).toBeNull();
  });

  it("agrees with the real helper on this repo's configured number", () => {
    // Guards the re-implementation above against drifting from the original —
    // the usual hazard of testing a copy of the logic.
    expect(whatsappUrl).toBe(toWhatsAppUrl(siteConfig.business.whatsapp));
    expect(whatsappUrl).toBe("https://wa.me/14165550148");
  });
});
