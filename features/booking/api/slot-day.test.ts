import { describe, expect, it } from "vitest";
import { businessDayKey, calendarDayKey } from "./slot-day";

const TORONTO = "America/Toronto";

describe("businessDayKey", () => {
  it("uses the business's day, not UTC's", () => {
    // 01:00 UTC on the 5th is still 9pm on the 4th in Toronto. Filing this
    // under the 5th would show an evening opening on the wrong date.
    expect(businessDayKey("2026-08-05T01:00:00.000Z", TORONTO)).toBe("2026-08-04");
  });

  it("handles the first instant of a business day", () => {
    // Midnight Toronto = 04:00 UTC in summer.
    expect(businessDayKey("2026-08-04T04:00:00.000Z", TORONTO)).toBe("2026-08-04");
    // One minute earlier is still the previous day.
    expect(businessDayKey("2026-08-04T03:59:00.000Z", TORONTO)).toBe("2026-08-03");
  });

  describe("across daylight saving", () => {
    // Spring forward: 2026-03-08, 2am EST -> 3am EDT.
    it("keeps the day correct on the short day", () => {
      // 9am local either side of the change.
      expect(businessDayKey("2026-03-07T14:00:00.000Z", TORONTO)).toBe("2026-03-07"); // EST, UTC-5
      expect(businessDayKey("2026-03-08T13:00:00.000Z", TORONTO)).toBe("2026-03-08"); // EDT, UTC-4
    });

    // Fall back: 2026-11-01, 2am EDT -> 1am EST. The 1am hour happens twice.
    it("resolves both passes of the repeated hour to the same day", () => {
      // 01:30 EDT (05:30Z) and 01:30 EST (06:30Z) are different instants that
      // both read as 1:30am on 1 November.
      expect(businessDayKey("2026-11-01T05:30:00.000Z", TORONTO)).toBe("2026-11-01");
      expect(businessDayKey("2026-11-01T06:30:00.000Z", TORONTO)).toBe("2026-11-01");
    });

    it("does not drift a day across the transition boundary", () => {
      // Midnight local on the day of the change, and just before it.
      expect(businessDayKey("2026-11-01T04:00:00.000Z", TORONTO)).toBe("2026-11-01");
      expect(businessDayKey("2026-11-01T03:59:00.000Z", TORONTO)).toBe("2026-10-31");
    });
  });

  it("gives a different answer for a business in another zone", () => {
    const instant = "2026-08-05T01:00:00.000Z";
    expect(businessDayKey(instant, TORONTO)).toBe("2026-08-04");
    // Same instant, a London practice: already the 5th there.
    expect(businessDayKey(instant, "Europe/London")).toBe("2026-08-05");
  });
});

describe("calendarDayKey", () => {
  it("reads the visitor's own calendar date", () => {
    // Constructed the way react-day-picker does: local midnight.
    expect(calendarDayKey(new Date(2026, 7, 4))).toBe("2026-08-04");
  });

  it("pads single-digit months and days", () => {
    expect(calendarDayKey(new Date(2026, 0, 9))).toBe("2026-01-09");
  });

  /**
   * The pairing that matters. A slot at 9pm Toronto is 01:00 UTC the next day;
   * if the calendar key were derived via UTC it would read "2026-08-05" and no
   * times would appear on the day the visitor actually clicked.
   */
  it("matches the business key for the day a visitor would click", () => {
    const eveningSlot = "2026-08-05T01:00:00.000Z"; // 9pm on the 4th in Toronto
    const clicked = new Date(2026, 7, 4); // the visitor clicks 4 August
    expect(calendarDayKey(clicked)).toBe(businessDayKey(eveningSlot, TORONTO));
  });

  it("is unaffected by daylight saving in the visitor's own zone", () => {
    // Local midnight on the DST change date is still that date.
    expect(calendarDayKey(new Date(2026, 2, 8))).toBe("2026-03-08");
    expect(calendarDayKey(new Date(2026, 10, 1))).toBe("2026-11-01");
  });
});
