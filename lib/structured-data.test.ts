import { describe, expect, it } from "vitest";
import type { SiteConfig } from "@/config/schema/site.schema";
import { buildLocalBusinessSchema, serialiseJsonLd } from "./structured-data";

const config = {
  business: {
    name: "Acme Dental",
    tagline: "Gentle dentistry",
    description: "Family and cosmetic dentistry.",
    phone: "(555) 010-2020",
    email: "hello@acmedental.example",
    address: {
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      zip: "62704",
      country: "US",
    },
    hours: [
      { day: "mon", opens: "09:00", closes: "17:00" },
      { day: "sat", opens: "09:00", closes: "13:00" },
      // Closed: must be omitted, not emitted with nulls.
      { day: "sun", opens: null, closes: null },
    ],
    schemaType: "Dentist",
    timezone: "America/Chicago",
  },
  nav: [{ label: "Services", href: "#services" }],
  seo: {
    defaultTitle: "Acme Dental",
    defaultDescription: "Dentistry",
  },
} as unknown as SiteConfig;

const SITE = "https://acmedental.example";

describe("buildLocalBusinessSchema", () => {
  it("uses the configured schema.org subtype", () => {
    expect(buildLocalBusinessSchema(config, SITE)["@type"]).toBe("Dentist");
  });

  it("carries the identity a local listing is built from", () => {
    const data = buildLocalBusinessSchema(config, SITE);
    expect(data.name).toBe("Acme Dental");
    expect(data.telephone).toBe("(555) 010-2020");
    expect(data.url).toBe(SITE);
    expect(data.address).toMatchObject({
      "@type": "PostalAddress",
      streetAddress: "123 Main St",
      addressLocality: "Springfield",
      addressRegion: "IL",
      postalCode: "62704",
    });
  });

  it("emits opening hours only for days the business is actually open", () => {
    const data = buildLocalBusinessSchema(config, SITE) as {
      openingHoursSpecification?: { dayOfWeek: string }[];
    };
    const days = data.openingHoursSpecification?.map((entry) => entry.dayOfWeek);
    // Sunday is closed, so it must not appear — an entry with null times is
    // malformed, and 00:00-00:00 would claim the business is open at midnight.
    expect(days).toEqual(["Monday", "Saturday"]);
  });

  it("omits the hours block entirely when nothing is open", () => {
    const closed = {
      ...config,
      business: { ...config.business, hours: [{ day: "sun", opens: null, closes: null }] },
    } as unknown as SiteConfig;
    expect(buildLocalBusinessSchema(closed, SITE)).not.toHaveProperty("openingHoursSpecification");
  });

  it("makes a relative ogImage absolute", () => {
    const withImage = {
      ...config,
      seo: { ...config.seo, ogImage: "/images/og.jpg" },
    } as unknown as SiteConfig;
    // A crawler that fetched this from elsewhere cannot resolve a bare path.
    expect(buildLocalBusinessSchema(withImage, SITE)).toMatchObject({
      image: "https://acmedental.example/images/og.jpg",
    });
  });

  it("omits image when none is configured", () => {
    expect(buildLocalBusinessSchema(config, SITE)).not.toHaveProperty("image");
  });
});

describe("serialiseJsonLd", () => {
  /**
   * The escaping that matters. JSON inside a <script> ends at the first literal
   * "</script>", so a config value containing one would close the tag early and
   * everything after it would be parsed as HTML.
   */
  it("escapes < so a value cannot close the script tag", () => {
    const output = serialiseJsonLd({ name: "</script><img src=x onerror=alert(1)>" });
    expect(output).not.toContain("</script>");
    expect(output).not.toContain("<img");
    expect(output).toContain("\\u003c");
  });

  it("still parses back to the original value", () => {
    const value = { name: "a < b", nested: { x: 1 } };
    expect(JSON.parse(serialiseJsonLd(value))).toEqual(value);
  });
});

/**
 * G12 — the rest of the script-context escape surface.
 *
 * The `<` case above is the control that actually matters: nothing else can
 * terminate the element early, and a terminated element is where injected
 * markup would begin. These cover the characters a `<script>` context cares
 * about beyond that one.
 *
 * Built with fromCharCode rather than written literally, because U+2028 and
 * U+2029 are invisible in an editor and a test nobody can read is a test
 * nobody will maintain.
 */
const LS = String.fromCharCode(0x2028); // LINE SEPARATOR
const PS = String.fromCharCode(0x2029); // PARAGRAPH SEPARATOR

describe("serialiseJsonLd — full script-context escaping", () => {
  /**
   * Both are legal unescaped inside a JSON string but are JavaScript line
   * terminators. They cannot break `application/ld+json`, which no browser
   * executes as script, so this is hardening rather than a live hole. It costs
   * nothing, and it stops the output silently becoming unsafe if this JSON is
   * ever moved into a script that *is* executed.
   */
  it("escapes the JavaScript line terminators U+2028 and U+2029", () => {
    const output = serialiseJsonLd({ name: `line${LS}break${PS}here` });

    expect(output).not.toContain(LS);
    expect(output).not.toContain(PS);
    expect(output).toContain("\\u2028");
    expect(output).toContain("\\u2029");
  });

  it("escapes > and & so no tag or entity survives intact", () => {
    const output = serialiseJsonLd({ a: "a > b & c" });

    expect(output).not.toContain(">");
    expect(output).not.toContain("&");
  });

  it("survives a round trip with every escaped character present", () => {
    const value = { "@type": "LocalBusiness", name: "A & B <Dental>", note: `x${LS}y${PS}z` };

    expect(JSON.parse(serialiseJsonLd(value))).toEqual(value);
  });
});
