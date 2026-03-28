import { describe, expect, it } from "vitest";

import { encodeCode128 } from "./code128";
import { renderCode128Svg } from "./renderSvg";

describe("renderCode128Svg", () => {
  it("renders deterministic SVG rectangles from canonical module widths", () => {
    const encoding = encodeCode128("WO20070317");
    const rendered = renderCode128Svg(encoding, {
      moduleWidth: 2,
      barcodeHeight: 60,
      quietZoneModules: 10,
      foreground: "#000000",
      background: "#ffffff",
    });

    expect(rendered.width).toBe(264);
    expect(rendered.height).toBe(60);
    expect(rendered.svg).toContain('viewBox="0 0 264 60"');
    expect(rendered.svg).toContain('<rect width="264" height="60" fill="#ffffff"/>');
    expect(rendered.svg).toContain('<rect x="20" y="0" width="4" height="60" fill="#000000"/>');
    expect(rendered.svg).toContain('<rect x="26" y="0" width="2" height="60" fill="#000000"/>');
    expect(rendered.svg).toContain('<rect x="32" y="0" width="2" height="60" fill="#000000"/>');
  });

  it("can append a human-readable label", () => {
    const encoding = encodeCode128("WO20070317");
    const rendered = renderCode128Svg(encoding, {
      moduleWidth: 2,
      barcodeHeight: 60,
      quietZoneModules: 10,
      labelText: encoding.plaintext,
      labelGap: 10,
      labelFontSize: 16,
    });

    expect(rendered.height).toBe(86);
    expect(rendered.svg).toContain('text-anchor="middle"');
    expect(rendered.svg).toContain('font-size="16"');
    expect(rendered.svg).toContain(">WO20070317</text>");
  });

  it("rejects invalid rendering dimensions", () => {
    const encoding = encodeCode128("WO20070317");

    expect(() => renderCode128Svg(encoding, { moduleWidth: 0 })).toThrow(
      "moduleWidth must be a positive number.",
    );
  });
});
