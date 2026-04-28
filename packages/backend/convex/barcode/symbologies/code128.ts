import type {
  Code128PngRender,
  Code128PngRenderOptions,
  Code128SvgRender,
} from "../../lib/barcodeTypes";
import { encodeCode128 } from "../../lib/code128";
import { toLibreBarcode128Text } from "../../lib/code128Libre";
import { renderCode128Svg } from "../../lib/renderSvg";
import type { NormalizedBarcodeRequest } from "../request";

export function encodeCode128Request(request: NormalizedBarcodeRequest) {
  const canonicalEncoding = encodeCode128(request.plaintext);
  const libreText = toLibreBarcode128Text(canonicalEncoding);

  return {
    plaintext: canonicalEncoding.plaintext,
    encodedText: libreText.encodedText,
    fontEncoding: libreText.fontEncoding,
    checksumValue: canonicalEncoding.checksumValue,
    canonicalEncoding,
  };
}

export function renderCode128RequestSvg(request: NormalizedBarcodeRequest): Code128SvgRender & {
  encoded: ReturnType<typeof encodeCode128Request>;
} {
  const encoded = encodeCode128Request(request);
  return {
    ...renderCode128Svg(encoded.canonicalEncoding, request.options),
    encoded,
  };
}

export async function renderCode128RequestPng(
  request: NormalizedBarcodeRequest,
  renderPng: (
    encoding: ReturnType<typeof encodeCode128>,
    options?: Code128PngRenderOptions,
  ) => Code128PngRender,
) {
  const encoded = encodeCode128Request(request);
  return {
    ...renderPng(encoded.canonicalEncoding, request.options),
    encoded,
  };
}
