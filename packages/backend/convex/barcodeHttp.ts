import { httpAction } from "./_generated/server";
import { renderCode128Png } from "../lib/renderPng";
import { renderBinaryModulesPng, renderMatrixPng } from "../lib/renderGenericPng";
import { normalizeBarcodeHttpRequest } from "./barcode/request";
import { listBarcodeTypesForClient } from "./barcode/types";
import { renderCode128RequestSvg } from "./barcode/symbologies/code128";
import { renderCode128RequestPng } from "./barcode/symbologies/code128";
import { generateBarcode } from "./barcode/generate";
import { encodeLinearBarcode } from "./barcode/symbologies/ean";
import { encodeQrMatrix } from "./barcode/symbologies/qr";

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Error-Message": message,
    },
  });
}

function imageHeaders(contentType: string, symbology: string, plaintext: string, cost: number) {
  return {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    "X-Barcode-Type": symbology,
    "X-Barcode-Content": plaintext,
    "X-Barcode-Cost": String(cost),
  };
}

export const code128Svg = httpAction(async (_ctx, request) => {
  try {
    const normalized = normalizeBarcodeHttpRequest(request, "svg");
    const rendered =
      normalized.symbology === "code128"
        ? renderCode128RequestSvg(normalized)
        : ((await generateBarcode(normalized)) as { svg: string });

    return new Response(rendered.svg, {
      status: 200,
      headers: imageHeaders(
        "image/svg+xml; charset=utf-8",
        normalized.symbology,
        normalized.plaintext,
        normalized.cost,
      ),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate Code 128 SVG.");
  }
});

export const code128Png = httpAction(async (_ctx, request) => {
  try {
    const normalized = normalizeBarcodeHttpRequest(request, "png");
    const rendered =
      normalized.symbology === "code128"
        ? await renderCode128RequestPng(normalized, renderCode128Png)
        : normalized.symbology === "qr"
          ? renderMatrixPng(encodeQrMatrix(normalized), normalized.options)
          : renderBinaryModulesPng(
              encodeLinearBarcode(normalized.symbology, normalized.plaintext),
              normalized.options,
            );
    const pngBody = Uint8Array.from(rendered.pngBytes).buffer;

    return new Response(pngBody, {
      status: 200,
      headers: imageHeaders(
        "image/png",
        normalized.symbology,
        normalized.plaintext,
        normalized.cost,
      ),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate Code 128 PNG.");
  }
});

export const barcodeTypes = httpAction(async () => {
  return new Response(JSON.stringify({ types: listBarcodeTypesForClient() }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
});
