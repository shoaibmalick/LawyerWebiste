import { describe, expect, it, vi } from "vitest";
import { formatDate, formatDateTime, formatDateTimeLong } from "./format";

vi.mock("@/config/site.config", () => ({
  siteConfig: { business: { timezone: "America/Toronto" } },
}));

// 17:00 UTC is 1:00 PM in Toronto during daylight saving.
const AFTERNOON = new Date("2026-08-04T17:00:00.000Z");
// 14:00 UTC is 9:00 AM in Toronto in winter — a different offset, so this
// catches anything that hardcodes one.
const WINTER_MORNING = new Date("2026-01-12T14:00:00.000Z");

describe("formatDateTime", () => {
  it("renders in the business's timezone, not the runtime's", () => {
    expect(formatDateTime(AFTERNOON)).toBe("Tue, Aug 4, 1:00 PM");
  });

  it("tracks the offset across daylight saving", () => {
    expect(formatDateTime(WINTER_MORNING)).toBe("Mon, Jan 12, 9:00 AM");
  });

  /**
   * The regression this file exists for.
   *
   * The old implementation used date.toLocaleString() with no timeZone, so it
   * formatted in whatever zone the process ran in. Vercel runs UTC, which
   * turned a 1:00 PM appointment into "5:00 PM" in the dashboard, on the
   * customer's account page and in their confirmation email.
   */
  it("is unaffected by the process timezone", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "UTC";
      expect(formatDateTime(AFTERNOON)).toBe("Tue, Aug 4, 1:00 PM");
      process.env.TZ = "Asia/Tokyo";
      expect(formatDateTime(AFTERNOON)).toBe("Tue, Aug 4, 1:00 PM");
    } finally {
      process.env.TZ = original;
    }
  });

  it("accepts an explicit override for a genuinely different zone", () => {
    expect(formatDateTime(AFTERNOON, "UTC")).toBe("Tue, Aug 4, 5:00 PM");
  });
});

describe("formatDate", () => {
  it("renders the date in the business's timezone, with the year", () => {
    expect(formatDate(AFTERNOON)).toBe("Aug 4, 2026");
  });

  /**
   * Why a date-only formatter needs the timezone pin *more* than a time one.
   *
   * 02:30 UTC on Aug 5 is 10:30 PM on Aug 4 in Toronto. Formatted in the
   * runtime's zone on a UTC host, a review left late one evening would be
   * filed under the following day — wrong by a whole day, not by four hours,
   * and completely invisible unless someone happens to check a late-night
   * submission.
   */
  it("puts a late-evening submission on the day it was actually made", () => {
    const lateEvening = new Date("2026-08-05T02:30:00.000Z");

    expect(formatDate(lateEvening)).toBe("Aug 4, 2026");
    expect(formatDate(lateEvening, "UTC")).toBe("Aug 5, 2026");
  });

  it("is unaffected by the process timezone", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "UTC";
      expect(formatDate(AFTERNOON)).toBe("Aug 4, 2026");
      process.env.TZ = "Asia/Tokyo";
      expect(formatDate(AFTERNOON)).toBe("Aug 4, 2026");
    } finally {
      process.env.TZ = original;
    }
  });

  it("tracks the offset across daylight saving", () => {
    expect(formatDate(WINTER_MORNING)).toBe("Jan 12, 2026");
  });
});

describe("formatDateTimeLong", () => {
  it("names the zone so a customer elsewhere knows which clock it is", () => {
    const formatted = formatDateTimeLong(AFTERNOON);
    expect(formatted).toContain("Tuesday");
    expect(formatted).toContain("August 4, 2026");
    expect(formatted).toContain("1:00 PM");
    expect(formatted).toMatch(/EDT|GMT-4/);
  });
});
