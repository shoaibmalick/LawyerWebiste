import { describe, expect, it } from "vitest";
import { sniffImageType } from "./image-type";

const bytes = (...values: number[]) => new Uint8Array(values);
const withAscii = (text: string, ...trailing: number[]) =>
  new Uint8Array([...[...text].map((char) => char.charCodeAt(0)), ...trailing]);

describe("sniffImageType", () => {
  it("recognises a JPEG", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toEqual({
      contentType: "image/jpeg",
      extension: "jpg",
    });
  });

  it("recognises a PNG", () => {
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toEqual({
      contentType: "image/png",
      extension: "png",
    });
  });

  it("recognises both GIF versions", () => {
    expect(sniffImageType(withAscii("GIF87a"))?.contentType).toBe("image/gif");
    expect(sniffImageType(withAscii("GIF89a"))?.contentType).toBe("image/gif");
  });

  it("recognises a WebP, skipping the length field", () => {
    // "RIFF" + 4 length bytes + "WEBP"
    const webp = new Uint8Array([
      ...withAscii("RIFF"),
      0x24,
      0x00,
      0x00,
      0x00,
      ...withAscii("WEBPVP8 "),
    ]);
    expect(sniffImageType(webp)?.contentType).toBe("image/webp");
  });

  it("recognises an AVIF by its brand", () => {
    const avif = new Uint8Array([0, 0, 0, 0x20, ...withAscii("ftypavif")]);
    expect(sniffImageType(avif)?.contentType).toBe("image/avif");
  });

  /**
   * The finding this exists for. SVG is a document, not a bitmap — it can
   * carry <script>, event handlers and remote references. Served from our own
   * origin it is stored XSS against the admin session that manages the page it
   * appears on. Hand-typed /public paths still allow .svg because those are
   * files the agency placed deliberately; an upload is a different trust level.
   */
  it("refuses SVG, however it is dressed up", () => {
    expect(sniffImageType(withAscii('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffImageType(withAscii('<?xml version="1.0"?><svg onload="alert(1)">'))).toBeNull();
  });

  it("refuses anything that is not an image", () => {
    expect(sniffImageType(withAscii("#!/bin/sh\nrm -rf /"))).toBeNull();
    expect(sniffImageType(withAscii("<!DOCTYPE html><script>alert(1)</script>"))).toBeNull();
    // A Windows executable.
    expect(sniffImageType(withAscii("MZ", 0x90, 0x00))).toBeNull();
    expect(sniffImageType(bytes())).toBeNull();
  });

  /**
   * A real upload arrives named portrait.png with Content-Type image/png. The
   * point of sniffing is that neither of those is consulted — only the bytes,
   * which here say "this is a shell script".
   */
  it("is not fooled by a hostile file wearing an image's name", () => {
    expect(sniffImageType(withAscii("#!/bin/sh"))).toBeNull();
  });

  it("does not read past the end of a short buffer", () => {
    // RIFF header truncated before the WEBP tag — must not throw.
    expect(() => sniffImageType(withAscii("RIFF"))).not.toThrow();
    expect(sniffImageType(withAscii("RIFF"))).toBeNull();
    expect(sniffImageType(bytes(0xff))).toBeNull();
  });
});
