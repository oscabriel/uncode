import type { Code128Encoding, LibreCode128Text } from "./barcodeTypes";

const LIBRE_BARCODE_128_STOP_CHARACTER = "\u00ce";

function mapCodeValueToLibreGlyph(codeValue: number) {
  if (codeValue < 0 || codeValue > 105) {
    throw new Error(`Code 128 value ${codeValue} cannot be represented by Libre Barcode 128.`);
  }

  if (codeValue === 0) {
    return "\u00c2";
  }

  if (codeValue >= 1 && codeValue <= 94) {
    return String.fromCharCode(codeValue + 32);
  }

  if (codeValue === 95) {
    return "\u00c3";
  }

  return String.fromCharCode(codeValue + 100);
}

export function toLibreBarcode128Text(encoding: Code128Encoding): LibreCode128Text {
  const encodedText =
    encoding.codeValues.slice(0, -1).map(mapCodeValueToLibreGlyph).join("") +
    LIBRE_BARCODE_128_STOP_CHARACTER;

  return {
    encodedText,
    fontEncoding: "libre-barcode-128",
  };
}
