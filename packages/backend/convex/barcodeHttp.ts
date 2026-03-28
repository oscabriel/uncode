import { httpAction } from "./_generated/server";
import { renderCode128Png } from "../lib/renderPng";
import { encodeCode128 } from "./lib/code128";
import { renderCode128Svg } from "./lib/renderSvg";

function getRequiredPlaintext(request: Request) {
  const plaintext = new URL(request.url).searchParams.get("text")?.trim();
  if (!plaintext) {
    throw new Error('Missing required "text" query parameter.');
  }
  return plaintext;
}

function parseOptionalNumber(name: string, value: string | null) {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return parsedValue;
}

function getSvgOptions(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const label = searchParams.get("label");
  const text = searchParams.get("text") ?? "";

  return {
    moduleWidth: parseOptionalNumber("moduleWidth", searchParams.get("moduleWidth")),
    barcodeHeight: parseOptionalNumber("barcodeHeight", searchParams.get("barcodeHeight")),
    quietZoneModules: parseOptionalNumber("quietZoneModules", searchParams.get("quietZoneModules")),
    foreground: searchParams.get("foreground") ?? undefined,
    background: searchParams.get("background") ?? undefined,
    labelText: label === null || label === "false" ? undefined : label === "true" ? text : label,
    labelGap: parseOptionalNumber("labelGap", searchParams.get("labelGap")),
    labelFontSize: parseOptionalNumber("labelFontSize", searchParams.get("labelFontSize")),
    labelFontFamily: searchParams.get("labelFontFamily") ?? undefined,
  };
}

function getPngOptions(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  return {
    moduleWidth: parseOptionalNumber("moduleWidth", searchParams.get("moduleWidth")),
    barcodeHeight: parseOptionalNumber("barcodeHeight", searchParams.get("barcodeHeight")),
    quietZoneModules: parseOptionalNumber("quietZoneModules", searchParams.get("quietZoneModules")),
    foreground: searchParams.get("foreground") ?? undefined,
    background: searchParams.get("background") ?? undefined,
  };
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export const code128Svg = httpAction(async (_ctx, request) => {
  try {
    const plaintext = getRequiredPlaintext(request);
    const encoding = encodeCode128(plaintext);
    const rendered = renderCode128Svg(encoding, getSvgOptions(request));

    return new Response(rendered.svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate Code 128 SVG.");
  }
});

export const code128Png = httpAction(async (_ctx, request) => {
  try {
    const plaintext = getRequiredPlaintext(request);
    const encoding = encodeCode128(plaintext);
    const rendered = renderCode128Png(encoding, getPngOptions(request));
    const pngBody = Uint8Array.from(rendered.pngBytes).buffer;

    return new Response(pngBody, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate Code 128 PNG.");
  }
});
