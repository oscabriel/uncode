import { encode } from "fast-png";

import type { LinearBarcodeEncoding } from "../convex/barcode/symbologies/ean";
import type { BarcodeMatrix } from "../convex/barcode/symbologies/qr";

type Color = { red: number; green: number; blue: number; alpha: number };
type RenderOptions = Record<string, string | number | boolean>;

function parseHexColor(color: string): Color {
  const match = color.trim().match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!match) throw new Error(`Color ${JSON.stringify(color)} must be a hex value like #111111.`);
  const digits = match[1]!;
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
  xStart: number,
  xEnd: number,
  yStart: number,
  yEnd: number,
  color: Color,
) {
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const offset = (width * y + x) << 2;
      pixels[offset] = color.red;
      pixels[offset + 1] = color.green;
      pixels[offset + 2] = color.blue;
      pixels[offset + 3] = color.alpha;
    }
  }
}

function finish(width: number, height: number, pixels: Uint8Array) {
  return {
    pngBytes: encode({ width, height, data: pixels, channels: 4, depth: 8 }),
    width,
    height,
  };
}

export function renderBinaryModulesPng(
  encoding: LinearBarcodeEncoding,
  options: RenderOptions = {},
) {
  const moduleWidth = Number(options.moduleWidth ?? options.module ?? 2);
  const height = Number(options.barcodeHeight ?? options.height ?? 72);
  const quietZoneModules = Number(options.quietZoneModules ?? options.qz ?? 10);
  const foreground = parseHexColor(String(options.foreground ?? options.fg ?? "#111111"));
  const background = parseHexColor(String(options.background ?? options.bg ?? "#ffffff"));
  const labelText =
    options.labelText === false ? "" : String(options.labelText ?? encoding.plaintext);
  const labelFontSize = Number(options.labelFontSize ?? 14);
  const labelGap = Number(options.labelGap ?? 8);
  const width = (encoding.moduleCount + quietZoneModules * 2) * moduleWidth;
  const textHeight = labelText ? labelGap + labelFontSize : 0;
  const pngHeight = height + textHeight;
  const pixels = new Uint8Array(width * pngHeight * 4);
  fillRect(pixels, width, 0, width, 0, pngHeight, background);
  for (let index = 0; index < encoding.modules.length; index += 1) {
    if (encoding.modules[index] === "1") {
      const x = (quietZoneModules + index) * moduleWidth;
      fillRect(pixels, width, x, x + moduleWidth, 0, height, foreground);
    }
  }
  return finish(width, pngHeight, pixels);
}

export function renderMatrixPng(matrix: BarcodeMatrix, options: RenderOptions = {}) {
  const foreground = parseHexColor(String(options.foreground ?? "#111111"));
  const background = parseHexColor(String(options.background ?? "#ffffff"));
  const pixels = new Uint8Array(matrix.width * matrix.height * 4);
  fillRect(pixels, matrix.width, 0, matrix.width, 0, matrix.height, background);
  for (let y = 0; y < matrix.height; y += 1) {
    for (let x = 0; x < matrix.width; x += 1) {
      if (matrix.get(x, y)) fillRect(pixels, matrix.width, x, x + 1, y, y + 1, foreground);
    }
  }
  return finish(matrix.width, matrix.height, pixels);
}
