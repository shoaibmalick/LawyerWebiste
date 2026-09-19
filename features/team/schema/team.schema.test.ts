import { describe, expect, it } from "vitest";
import { saveTeamSchema } from "./team.schema";

const member = (over: Record<string, unknown> = {}) => ({
  name: "Ada Lovelace",
  role: "Lead Dentist, DDS",
  bio: "Twelve years in general and cosmetic dentistry.",
  ...over,
});

const parse = (members: unknown[]) => saveTeamSchema.safeParse({ members });

describe("saveTeamSchema", () => {
  it("accepts a member with a local photo path", () => {
    const result = parse([member({ photo: "/images/team/ada.jpg" })]);

    expect(result.success).toBe(true);
    expect(result.success && result.data.members[0].photo).toBe("/images/team/ada.jpg");
  });

  it("accepts a member with no photo at all", () => {
    const result = parse([member()]);

    expect(result.success).toBe(true);
    expect(result.success && result.data.members[0].photo).toBeUndefined();
  });

  it("treats an empty photo field as no photo", () => {
    // The form always submits the input, so an untouched one arrives as "".
    // Without this the member would fail validation for not filling in an
    // optional field.
    for (const blank of ["", "   "]) {
      const result = parse([member({ photo: blank })]);
      expect(result.success, `"${blank}" rejected`).toBe(true);
      expect(result.success && result.data.members[0].photo).toBeUndefined();
    }
  });

  it("rejects a remote photo URL", () => {
    // This is the important one. next.config.ts sets no `images` key, so
    // next/image throws on a remote src at render time — and TeamGrid renders
    // on the homepage, so it would take the whole page down rather than show a
    // broken image. Pasting an image address from a browser is a completely
    // reasonable thing for a receptionist to do.
    for (const url of [
      "https://example.com/ada.jpg",
      "http://example.com/ada.jpg",
      "//example.com/ada.jpg",
    ]) {
      const result = parse([member({ photo: url })]);
      expect(result.success, `${url} was accepted`).toBe(false);
    }
  });

  it("explains what to use instead when given a URL", () => {
    const result = parse([member({ photo: "https://example.com/ada.jpg" })]);

    expect(result.success).toBe(false);
    // The admin has to be able to act on this without reading the source.
    expect(result.success === false && result.error.issues[0].message).toMatch(
      /path under \/public/,
    );
  });

  it("rejects a path that climbs out of /public", () => {
    const result = parse([member({ photo: "/images/../../../etc/passwd.png" })]);

    expect(result.success).toBe(false);
  });

  it("rejects a path that isn't an image", () => {
    const result = parse([member({ photo: "/images/team/notes.txt" })]);

    expect(result.success).toBe(false);
  });

  /**
   * An uploaded photo is served by a route handler, so it has no file
   * extension for the check above to look at. It is accepted by shape instead
   * — and the shape has to stay narrow, because widening the extension rule is
   * exactly how a traversal or a scheme could sneak back in.
   */
  describe("uploaded photos", () => {
    it("accepts the path an upload is served from", () => {
      const result = parse([member({ photo: "/api/team-photo/clx1a2b3c4d5e6f7g8h9" })]);

      expect(result.success).toBe(true);
      expect(result.success && result.data.members[0].photo).toBe(
        "/api/team-photo/clx1a2b3c4d5e6f7g8h9",
      );
    });

    it("does not accept anything else under that prefix", () => {
      for (const photo of [
        "/api/team-photo/../../etc/passwd",
        "/api/team-photo/abc/../../../secret",
        "/api/team-photo/",
        "/api/team-photo/abc.png/extra",
        "/api/team-photo",
        "/api/team-photo/abc?x=1",
        "/api/team-photo/<script>",
      ]) {
        const result = parse([member({ photo })]);
        expect(result.success, `${photo} was accepted`).toBe(false);
      }
    });
  });

  it("accepts every extension next/image can render", () => {
    for (const ext of ["jpg", "jpeg", "png", "webp", "avif", "gif", "svg", "JPG", "PNG"]) {
      const result = parse([member({ photo: `/images/team/ada.${ext}` })]);
      expect(result.success, `.${ext} rejected`).toBe(true);
    }
  });

  it("requires a name, role and bio", () => {
    for (const field of ["name", "role", "bio"] as const) {
      expect(parse([member({ [field]: "" })]).success, `empty ${field} accepted`).toBe(false);
      expect(parse([member({ [field]: "   " })]).success, `blank ${field} accepted`).toBe(false);
    }
  });

  it("trims the text fields", () => {
    const result = parse([member({ name: "  Ada Lovelace  " })]);

    expect(result.success && result.data.members[0].name).toBe("Ada Lovelace");
  });

  it("accepts an empty roster", () => {
    // Removing everyone is a legitimate choice — a solo practice that would
    // rather not have a team section at all.
    expect(parse([]).success).toBe(true);
  });

  it("caps the roster", () => {
    const fifty = Array.from({ length: 50 }, () => member());

    expect(parse(fifty).success).toBe(true);
    expect(parse([...fifty, member()]).success).toBe(false);
  });

  it("keeps an id when one is given, and allows none", () => {
    const withId = parse([member({ id: "abc123" })]);
    expect(withId.success && withId.data.members[0].id).toBe("abc123");

    const withoutId = parse([member()]);
    expect(withoutId.success && withoutId.data.members[0].id).toBeUndefined();
  });

  it("rejects over-long text rather than truncating it", () => {
    expect(parse([member({ name: "a".repeat(121) })]).success).toBe(false);
    expect(parse([member({ bio: "a".repeat(601) })]).success).toBe(false);
  });
});
