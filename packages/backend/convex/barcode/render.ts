import type { LinearBarcodeEncoding } from "./symbologies/ean";
import type { BarcodeMatrix } from "./symbologies/qr";

type RenderOptions = Record<string, string | number | boolean>;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderBinaryModulesSvg(
  encoding: LinearBarcodeEncoding,
  options: RenderOptions,
  ariaLabel: string,
) {
  const moduleWidth = Number(options.moduleWidth ?? options.module ?? 2);
  const height = Number(options.barcodeHeight ?? options.height ?? 72);
  const quietZoneModules = Number(options.quietZoneModules ?? options.qz ?? 10);
  const foreground = String(options.foreground ?? options.fg ?? "#111111");
  const background = String(options.background ?? options.bg ?? "#ffffff");
  const labelText =
    options.labelText === false ? "" : String(options.labelText ?? encoding.plaintext);
  const labelFontSize = Number(options.labelFontSize ?? 14);
  const labelGap = Number(options.labelGap ?? 8);
  const width = (encoding.moduleCount + quietZoneModules * 2) * moduleWidth;
  const textHeight = labelText ? labelGap + labelFontSize : 0;
  const svgHeight = height + textHeight;
  const rects: string[] = [];
  for (let index = 0; index < encoding.modules.length; index += 1) {
    if (encoding.modules[index] === "1") {
      rects.push(
        `<rect x="${(quietZoneModules + index) * moduleWidth}" y="0" width="${moduleWidth}" height="${height}" fill="${foreground}"/>`,
      );
    }
  }
  const label = labelText
    ? `<text x="${width / 2}" y="${height + labelGap + labelFontSize * 0.8}" text-anchor="middle" font-size="${labelFontSize}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" fill="${foreground}">${escapeXml(labelText)}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${svgHeight}" viewBox="0 0 ${width} ${svgHeight}" role="img" aria-label="${escapeXml(ariaLabel)}"><rect width="${width}" height="${svgHeight}" fill="${background}"/>${rects.join("")}${label}</svg>`;
}

export function renderMatrixSvg(matrix: BarcodeMatrix, options: RenderOptions, ariaLabel: string) {
  const foreground = String(options.foreground ?? "#111111");
  const background = String(options.background ?? "#ffffff");
  const rects: string[] = [];
  for (let y = 0; y < matrix.height; y += 1) {
    for (let x = 0; x < matrix.width; x += 1) {
      if (matrix.get(x, y))
        rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${foreground}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${matrix.width}" height="${matrix.height}" viewBox="0 0 ${matrix.width} ${matrix.height}" role="img" aria-label="${escapeXml(ariaLabel)}"><rect width="${matrix.width}" height="${matrix.height}" fill="${background}"/>${rects.join("")}</svg>`;
}
