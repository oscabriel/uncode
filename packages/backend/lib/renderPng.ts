import { encode } from "fast-png";

import type {
  Code128Encoding,
  Code128PngRender,
  Code128PngRenderOptions,
} from "../convex/lib/barcodeTypes";

const DEFAULT_OPTIONS: Required<Code128PngRenderOptions> = {
  moduleWidth: 2,
  barcodeHeight: 72,
  quietZoneModules: 10,
  foreground: "#111111",
  background: "#ffffff",
};

function assertPositiveNumber(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
}

function parseHexColor(color: string) {
  const normalized = color.trim();
  const shortMatch = normalized.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4})$/);
  if (shortMatch) {
    const digits = shortMatch[1]!;
    const expanded = digits
      .split("")
      .map((digit) => digit + digit)
      .join("");
    return parseHexColor(`#${expanded}`);
  }

  const longMatch = normalized.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!longMatch) {
    throw new Error(
      `Color ${JSON.stringify(color)} must be a hex value like #111111 or #ffffffff.`,
    );
  }

  const digits = longMatch[1]!;
  return {
    red: Number.parseInt(digits.slice(0, 2), 16),
    green: Number.parseInt(digits.slice(2, 4), 16),
    blue: Number.parseInt(digits.slice(4, 6), 16),
    alpha: digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) : 255,
  };
}

function fillRect(
  pixels: Uint8Array,
  width: number,
  height: number,
  xStart: number,
  xEnd: number,
  color: { red: number; green: number; blue: number; alpha: number },
) {
  for (let y = 0; y < height; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const offset = (width * y + x) << 2;
      pixels[offset] = color.red;
      pixels[offset + 1] = color.green;
      pixels[offset + 2] = color.blue;
      pixels[offset + 3] = color.alpha;
    }
  }
}

export function renderCode128Png(
  encoding: Code128Encoding,
  options: Code128PngRenderOptions = {},
): Code128PngRender {
  const moduleWidth = options.moduleWidth ?? DEFAULT_OPTIONS.moduleWidth;
  const barcodeHeight = options.barcodeHeight ?? DEFAULT_OPTIONS.barcodeHeight;
  const quietZoneModules = options.quietZoneModules ?? DEFAULT_OPTIONS.quietZoneModules;
  const foreground = parseHexColor(options.foreground ?? DEFAULT_OPTIONS.foreground);
  const background = parseHexColor(options.background ?? DEFAULT_OPTIONS.background);

  assertPositiveNumber("moduleWidth", moduleWidth);
  assertPositiveNumber("barcodeHeight", barcodeHeight);
  assertPositiveNumber("quietZoneModules", quietZoneModules);

  const width = (encoding.moduleCount + quietZoneModules * 2) * moduleWidth;
  const height = barcodeHeight;
  const pixels = new Uint8Array(width * height * 4);

  fillRect(pixels, width, height, 0, width, background);

  let x = quietZoneModules * moduleWidth;

  for (const symbolWidths of encoding.moduleWidths) {
    let isBar = true;

    for (const segmentWidth of symbolWidths) {
      const segmentPixelWidth = segmentWidth * moduleWidth;
      if (isBar) {
        fillRect(pixels, width, height, x, x + segmentPixelWidth, foreground);
      }

      x += segmentPixelWidth;
      isBar = !isBar;
    }
  }

  return {
    pngBytes: encode({
      width,
      height,
      data: pixels,
      channels: 4,
      depth: 8,
    }),
    width,
    height,
  };
}
