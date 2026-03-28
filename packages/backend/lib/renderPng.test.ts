import { decode, hasPngSignature } from "fast-png";
import { describe, expect, it } from "vitest";

import { encodeCode128 } from "../convex/lib/code128";
import { renderCode128Png } from "./renderPng";

function pixelOffset(width: number, x: number, y = 0) {
  return (y * width + x) << 2;
}

describe("renderCode128Png", () => {
  it("renders a PNG with the expected dimensions and barcode pixels", () => {
    const encoding = encodeCode128("WO20070317");
    const rendered = renderCode128Png(encoding, {
      moduleWidth: 2,
      barcodeHeight: 60,
      quietZoneModules: 10,
      foreground: "#000000",
      background: "#ffffff",
    });
    const bytes = Buffer.from(rendered.pngBytes);
    const png = decode(bytes);

    expect(rendered.width).toBe(264);
    expect(rendered.height).toBe(60);
    expect(hasPngSignature(bytes)).toBe(true);
    expect(png.width).toBe(264);
    expect(png.height).toBe(60);
    expect(Array.from(png.data.subarray(0, 4))).toEqual([255, 255, 255, 255]);

    const firstBarOffset = pixelOffset(png.width, 20);
    const firstGapOffset = pixelOffset(png.width, 24);

    expect(Array.from(png.data.subarray(firstBarOffset, firstBarOffset + 4))).toEqual([
      0, 0, 0, 255,
    ]);
    expect(Array.from(png.data.subarray(firstGapOffset, firstGapOffset + 4))).toEqual([
      255, 255, 255, 255,
    ]);
  });

  it("supports alpha-aware hex colors", () => {
    const encoding = encodeCode128("WO20070317");
    const rendered = renderCode128Png(encoding, {
      foreground: "#112233cc",
      background: "#ffeedd80",
    });
    const png = decode(Buffer.from(rendered.pngBytes));

    expect(Array.from(png.data.subarray(0, 4))).toEqual([255, 238, 221, 128]);

    const firstBarOffset = pixelOffset(png.width, 20);
    expect(Array.from(png.data.subarray(firstBarOffset, firstBarOffset + 4))).toEqual([
      17, 34, 51, 204,
    ]);
  });

  it("rejects non-hex color values", () => {
    const encoding = encodeCode128("WO20070317");

    expect(() => renderCode128Png(encoding, { foreground: "black" })).toThrow(
      'Color "black" must be a hex value like #111111 or #ffffffff.',
    );
  });
});
