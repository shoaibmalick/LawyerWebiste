import { describe, expect, it } from "vitest";
import { buildSlots, zonedWallTimeToInstant } from "./build-slots";

const TZ = "America/Toronto";

describe("zonedWallTimeToInstant", () => {
  it("resolves a summer wall time using the DST offset", () => {
    // Toronto is UTC-4 in August, so 09:00 local is 13:00Z.
    expect(zonedWallTimeToInstant("2026-08-10", "09:00", TZ).toISOString()).toBe(
      "2026-08-10T13:00:00.000Z",
    );
  });

  it("resolves a winter wall time using the standard offset", () => {
    // UTC-5 in January, so the same 09:00 local is 14:00Z — one hour later in
    // absolute terms than the summer case above.
    expect(zonedWallTimeToInstant("2026-01-12", "09:00", TZ).toISOString()).toBe(
      "2026-01-12T14:00:00.000Z",
    );
  });

  it("keeps the wall time stable across a spring-forward boundary", () => {
    // 2026-03-08 is the DST switch. 09:00 local must stay 09:00 local on both
    // sides, even though the UTC offset changed between them.
    const before = zonedWallTimeToInstant("2026-03-07", "09:00", TZ);
    const after = zonedWallTimeToInstant("2026-03-09", "09:00", TZ);

    const readBack = (d: Date) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);

    expect(readBack(before)).toBe("09:00");
    expect(readBack(after)).toBe("09:00");
    // And they are NOT simply 48h apart — that is the bug this guards against.
    expect(after.getTime() - before.getTime()).not.toBe(48 * 60 * 60 * 1000);
  });
});

describe("buildSlots", () => {
  const base = {
    from: "2026-08-10", // Monday
    to: "2026-08-16", // Sunday
    weekdays: [1, 3], // Mon, Wed
    times: ["09:00", "14:00"],
    slotMinutes: 60,
    timeZone: TZ,
  };

  it("produces one slot per matching weekday and time", () => {
    const slots = buildSlots(base);
    // 2 weekdays x 2 times — and crucially NOT multiplied by services: a slot
    // is a unit of the business's time, so nine services do not mean nine rows.
    expect(slots).toHaveLength(4);
    expect(slots.map((slot) => slot.startsAt.toISOString())).toEqual([
      "2026-08-10T13:00:00.000Z",
      "2026-08-10T18:00:00.000Z",
      "2026-08-12T13:00:00.000Z",
      "2026-08-12T18:00:00.000Z",
    ]);
  });

  it("never produces two slots at the same instant", () => {
    const slots = buildSlots({ ...base, weekdays: [1, 2, 3, 4, 5], times: ["09:00", "10:00"] });
    const starts = slots.map((slot) => slot.startsAt.getTime());
    expect(new Set(starts).size).toBe(starts.length);
  });

  it("sizes every slot by slotMinutes", () => {
    const slots = buildSlots({ ...base, slotMinutes: 45, times: ["09:00"], weekdays: [1] });
    expect(slots).toHaveLength(1);
    expect(slots[0].endsAt.getTime() - slots[0].startsAt.getTime()).toBe(45 * 60_000);
  });

  it("returns nothing when the range is inverted or a dimension is empty", () => {
    expect(buildSlots({ ...base, from: "2026-08-16", to: "2026-08-10" })).toEqual([]);
    expect(buildSlots({ ...base, weekdays: [] })).toEqual([]);
    expect(buildSlots({ ...base, times: [] })).toEqual([]);
    expect(buildSlots({ ...base, slotMinutes: 0 })).toEqual([]);
  });

  it("includes both endpoints of the range", () => {
    const slots = buildSlots({
      ...base,
      from: "2026-08-10",
      to: "2026-08-12",
      weekdays: [1, 2, 3],
      times: ["09:00"],
    });
    expect(slots.map((slot) => slot.startsAt.toISOString().slice(0, 10))).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
  });
});
