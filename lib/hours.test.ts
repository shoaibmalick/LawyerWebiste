import { describe, expect, it } from "vitest";

import { summariseOpeningHours } from "./hours";

const closed = (day: string) => ({ day, opens: null, closes: null });
const open = (day: string, opens = "09:00", closes = "17:00") => ({ day, opens, closes });

describe("summariseOpeningHours", () => {
  it("collapses consecutive days that share hours into a range", () => {
    expect(
      summariseOpeningHours([open("mon"), open("tue"), open("wed"), open("thu"), open("fri")]),
    ).toBe("Mon–Fri 09:00–17:00");
  });

  it("keeps a day with different hours as its own entry", () => {
    expect(
      summariseOpeningHours([
        closed("mon"),
        open("tue", "10:00", "19:00"),
        open("wed", "10:00", "19:00"),
        open("sat", "09:00", "17:00"),
      ]),
    ).toBe("Tue–Wed 10:00–19:00  ·  Sat 09:00–17:00");
  });

  it("leaves a single open day as a single day", () => {
    expect(summariseOpeningHours([open("sat")])).toBe("Sat 09:00–17:00");
  });

  it("drops closed days rather than listing them", () => {
    expect(summariseOpeningHours([closed("sun"), open("mon"), closed("tue")])).toBe(
      "Mon 09:00–17:00",
    );
  });

  /**
   * The one that matters. Open Monday and Wednesday but closed Tuesday must
   * never render "Mon–Wed", which would tell someone the business is open on a
   * day it is shut — the failure mode where a customer turns up to a locked
   * door. Identical hours either side of a gap are exactly the case a naive
   * run-builder gets wrong.
   */
  it("does not bridge a closed day, even when the hours either side match", () => {
    expect(summariseOpeningHours([open("mon"), closed("tue"), open("wed")])).toBe(
      "Mon 09:00–17:00  ·  Wed 09:00–17:00",
    );
  });

  it("returns an empty string when the business is never open", () => {
    expect(summariseOpeningHours([closed("mon"), closed("tue")])).toBe("");
  });

  it("returns an empty string for no hours at all", () => {
    expect(summariseOpeningHours([])).toBe("");
  });

  it("falls back to the raw key for a day it does not recognise", () => {
    expect(summariseOpeningHours([open("caturday")])).toBe("caturday 09:00–17:00");
  });
});
