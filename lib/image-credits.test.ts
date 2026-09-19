import { describe, expect, it } from "vitest";
import type { ImageCredit } from "@/config/schema/content.schema";
import { creditsForDisplayedImages } from "./image-credits";

const credit = (src: string, attributionRequired = false): ImageCredit => ({
  src,
  usedFor: "Team",
  title: "A photograph",
  creator: "Someone",
  license: attributionRequired ? "CC BY 2.0" : "CC0 1.0",
  licenseUrl: "https://example.test/licence",
  sourceUrl: "https://example.test/source",
  attributionRequired,
});

const CREDITS = [
  credit("/images/team/one.jpg", true),
  credit("/images/team/two.jpg"),
  credit("/images/clinic/room.jpg"),
];

describe("creditsForDisplayedImages", () => {
  it("keeps the credit for an image that is still on the site", () => {
    const shown = creditsForDisplayedImages(CREDITS, ["/images/team/one.jpg"]);

    expect(shown.map((c) => c.src)).toEqual(["/images/team/one.jpg"]);
  });

  it("drops the credit for an image that has been replaced", () => {
    // The licensing failure this exists to prevent: an admin swaps in a
    // clinic-owned headshot and the page keeps crediting a photographer for a
    // picture that is no longer there.
    const shown = creditsForDisplayedImages(CREDITS, [
      "/images/team/clinic-owned.jpg",
      "/images/clinic/room.jpg",
    ]);

    expect(shown.map((c) => c.src)).toEqual(["/images/clinic/room.jpg"]);
  });

  it("drops a required attribution when its photo is removed", () => {
    const shown = creditsForDisplayedImages(CREDITS, ["/images/team/two.jpg"]);

    expect(shown.some((c) => c.attributionRequired)).toBe(false);
  });

  it("brings a credit back when its photo is used again", () => {
    // Attribution attaches to the file, not to the staff member: the entry
    // names the photographer, so reusing the path re-incurs the obligation
    // even for a different person.
    const shown = creditsForDisplayedImages(CREDITS, ["/images/team/one.jpg"]);

    expect(shown[0].attributionRequired).toBe(true);
  });

  it("ignores photos that have no credit entry", () => {
    const shown = creditsForDisplayedImages(CREDITS, ["/images/team/untracked.jpg"]);

    expect(shown).toEqual([]);
  });

  it("skips members with no photo without dropping everyone else", () => {
    // team.photo is nullable, and a member without one is common.
    const shown = creditsForDisplayedImages(CREDITS, [
      null,
      undefined,
      "/images/team/one.jpg",
      null,
    ]);

    expect(shown.map((c) => c.src)).toEqual(["/images/team/one.jpg"]);
  });

  it("returns nothing when the site displays nothing", () => {
    expect(creditsForDisplayedImages(CREDITS, [])).toEqual([]);
  });

  it("does not duplicate a credit when the same photo is used twice", () => {
    const shown = creditsForDisplayedImages(CREDITS, [
      "/images/team/one.jpg",
      "/images/team/one.jpg",
    ]);

    expect(shown).toHaveLength(1);
  });

  it("preserves the order of the credits list, not the display list", () => {
    const shown = creditsForDisplayedImages(CREDITS, [
      "/images/clinic/room.jpg",
      "/images/team/one.jpg",
    ]);

    expect(shown.map((c) => c.src)).toEqual(["/images/team/one.jpg", "/images/clinic/room.jpg"]);
  });
});
