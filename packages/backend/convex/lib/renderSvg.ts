import type { Code128Encoding, Code128SvgRender, Code128SvgRenderOptions } from "./barcodeTypes";

const DEFAULT_OPTIONS = {
  moduleWidth: 2,
  barcodeHeight: 72,
  quietZoneModules: 10,
  foreground: "#111111",
  background: "#ffffff",
  labelGap: 12,
  labelFontSize: 14,
  labelFontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} satisfies Required<Omit<Code128SvgRenderOptions, "labelText">>;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function assertPositiveNumber(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
}

export function renderCode128Svg(
  encoding: Code128Encoding,
  options: Code128SvgRenderOptions = {},
): Code128SvgRender {
  const moduleWidth = options.moduleWidth ?? DEFAULT_OPTIONS.moduleWidth;
  const barcodeHeight = options.barcodeHeight ?? DEFAULT_OPTIONS.barcodeHeight;
  const quietZoneModules = options.quietZoneModules ?? DEFAULT_OPTIONS.quietZoneModules;
  const foreground = options.foreground ?? DEFAULT_OPTIONS.foreground;
  const background = options.background ?? DEFAULT_OPTIONS.background;
  const labelText = options.labelText;
  const labelGap = options.labelGap ?? DEFAULT_OPTIONS.labelGap;
  const labelFontSize = options.labelFontSize ?? DEFAULT_OPTIONS.labelFontSize;
  const labelFontFamily = options.labelFontFamily ?? DEFAULT_OPTIONS.labelFontFamily;

  assertPositiveNumber("moduleWidth", moduleWidth);
  assertPositiveNumber("barcodeHeight", barcodeHeight);
  assertPositiveNumber("quietZoneModules", quietZoneModules);

  if (labelText !== undefined) {
    assertPositiveNumber("labelGap", labelGap);
    assertPositiveNumber("labelFontSize", labelFontSize);
  }

  const quietZoneWidth = quietZoneModules * moduleWidth;
  const width = (encoding.moduleCount + quietZoneModules * 2) * moduleWidth;
  const textHeight = labelText ? labelGap + labelFontSize : 0;
  const height = barcodeHeight + textHeight;

  const rects: string[] = [];
  let x = quietZoneWidth;

  for (const symbolWidths of encoding.moduleWidths) {
    let isBar = true;

    for (const segmentWidth of symbolWidths) {
      const segmentPixelWidth = segmentWidth * moduleWidth;
      if (isBar) {
        rects.push(
          `<rect x="${x}" y="0" width="${segmentPixelWidth}" height="${barcodeHeight}" fill="${foreground}"/>`,
        );
      }

      x += segmentPixelWidth;
      isBar = !isBar;
    }
  }

  const labelMarkup = labelText
    ? `<text x="${width / 2}" y="${barcodeHeight + labelGap + labelFontSize * 0.8}" text-anchor="middle" font-size="${labelFontSize}" font-family="${escapeXml(labelFontFamily)}" fill="${foreground}">${escapeXml(labelText)}</text>`
    : "";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Code 128 barcode for ${escapeXml(encoding.plaintext)}">`,
    `<rect width="${width}" height="${height}" fill="${background}"/>`,
    ...rects,
    labelMarkup,
    "</svg>",
  ]
    .filter(Boolean)
    .join("");

  return {
    svg,
    width,
    height,
  };
}
