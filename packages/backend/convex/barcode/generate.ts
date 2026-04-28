import type { NormalizedBarcodeRequest } from "./request";
import { renderBinaryModulesSvg, renderMatrixSvg } from "./render";
import { encodeLinearBarcode } from "./symbologies/ean";
import { encodeCode128Request, renderCode128RequestSvg } from "./symbologies/code128";
import { encodeQrMatrix } from "./symbologies/qr";

export type BarcodeGeneratorDefinition = {
  encode?: (request: NormalizedBarcodeRequest) => unknown;
  renderSvg?: (request: NormalizedBarcodeRequest) => string;
};

const BARCODE_GENERATORS: Record<string, BarcodeGeneratorDefinition> = {
  code128: {
    encode: encodeCode128Request,
    renderSvg: (request) => renderCode128RequestSvg(request).svg,
  },
  qr: {
    encode: (request) => ({ plaintext: request.plaintext }),
    renderSvg: (request) =>
      renderMatrixSvg(encodeQrMatrix(request), request.options, `QR Code for ${request.plaintext}`),
  },
  ean13: {
    encode: (request) => encodeLinearBarcode("ean13", request.plaintext),
    renderSvg: (request) => {
      const encoded = encodeLinearBarcode("ean13", request.plaintext);
      return renderBinaryModulesSvg(
        encoded,
        request.options,
        `EAN 13 barcode for ${encoded.plaintext}`,
      );
    },
  },
  ean8: {
    encode: (request) => encodeLinearBarcode("ean8", request.plaintext),
    renderSvg: (request) => {
      const encoded = encodeLinearBarcode("ean8", request.plaintext);
      return renderBinaryModulesSvg(
        encoded,
        request.options,
        `EAN 8 barcode for ${encoded.plaintext}`,
      );
    },
  },
  upca: {
    encode: (request) => encodeLinearBarcode("upca", request.plaintext),
    renderSvg: (request) => {
      const encoded = encodeLinearBarcode("upca", request.plaintext);
      return renderBinaryModulesSvg(
        encoded,
        request.options,
        `UPC A barcode for ${encoded.plaintext}`,
      );
    },
  },
};

export async function generateBarcode(request: NormalizedBarcodeRequest) {
  const generator = BARCODE_GENERATORS[request.symbology];
  if (!generator) throw new Error(`Unsupported barcode type: ${request.symbology}`);

  if (request.outputFormat === "json") {
    if (!generator.encode) throw new Error(`${request.symbology} does not support encoding.`);
    return generator.encode(request);
  }

  if (request.outputFormat === "svg") {
    if (!generator.renderSvg) throw new Error(`${request.symbology} does not support SVG output.`);
    return { svg: generator.renderSvg(request) };
  }

  throw new Error(
    `${request.symbology} ${request.outputFormat} output requires a Node runtime action.`,
  );
}
