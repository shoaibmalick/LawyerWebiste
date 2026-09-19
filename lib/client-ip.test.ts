import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  /**
   * The bug. Every rate-limited route keyed on the raw header, so an attacker
   * who varied it per request got a brand-new quota each time — and inserted
   * an unbounded number of keys into the limiter's map on the way.
   */
  it("prefers the platform-set header over the one the client controls", () => {
    const ip = clientIp(
      h({
        "x-vercel-forwarded-for": "198.51.100.42",
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
      }),
    );

    expect(ip).toBe("198.51.100.42");
  });

  it("falls back to x-real-ip before the client-controlled header", () => {
    expect(clientIp(h({ "x-real-ip": "5.6.7.8", "x-forwarded-for": "1.2.3.4" }))).toBe("5.6.7.8");
  });

  it("takes the leftmost entry of a forwarded-for chain", () => {
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.9, 70.41.3.18, 150.172.238.178" }))).toBe(
      "203.0.113.9",
    );
  });

  it("tolerates the spacing proxies actually emit", () => {
    expect(clientIp(h({ "x-forwarded-for": "  203.0.113.9  ,70.41.3.18" }))).toBe("203.0.113.9");
  });

  it("handles IPv6", () => {
    expect(clientIp(h({ "x-forwarded-for": "2001:db8::8a2e:370:7334" }))).toBe(
      "2001:db8::8a2e:370:7334",
    );
    expect(clientIp(h({ "x-forwarded-for": "::ffff:192.0.2.128" }))).toBe("::ffff:192.0.2.128");
  });

  it("rejects a zone id, which only ever accompanies an unroutable address", () => {
    expect(clientIp(h({ "x-forwarded-for": "fe80::1%eth0" }))).toBe("unknown");
  });

  /**
   * Anything that is not address-shaped is ignored rather than used as a key.
   * A limiter key built from arbitrary client text is an unbounded allocation
   * driven by the attacker.
   */
  it("ignores header values that are not addresses", () => {
    expect(clientIp(h({ "x-forwarded-for": "not-an-ip" }))).toBe("unknown");
    expect(clientIp(h({ "x-forwarded-for": "<script>alert(1)</script>" }))).toBe("unknown");
    expect(clientIp(h({ "x-forwarded-for": "a".repeat(5000) }))).toBe("unknown");
  });

  it("skips a junk entry and uses the first real address after it", () => {
    expect(clientIp(h({ "x-forwarded-for": "unknown, 203.0.113.9" }))).toBe("203.0.113.9");
  });

  /**
   * Deliberately one shared bucket, not a unique key. Everyone unidentifiable
   * throttles each other, which fails closed; the alternative is no limit at
   * all. In practice this is local development only.
   */
  it("returns a single shared key when there is nothing to go on", () => {
    expect(clientIp(h({}))).toBe("unknown");
    expect(clientIp(h({ "x-forwarded-for": "" }))).toBe("unknown");
  });
});
