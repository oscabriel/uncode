import type { BarcodeSymbology } from "../types";

const L_PATTERNS = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
] as const;

const G_PATTERNS = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
] as const;

const R_PATTERNS = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
] as const;

const EAN13_PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
] as const;

export type LinearBarcodeEncoding = {
  plaintext: string;
  checksumValue: number;
  modules: string;
  moduleCount: number;
};

export function calculateUpcEanChecksum(dataWithoutCheckDigit: string) {
  let sum = 0;
  for (let index = dataWithoutCheckDigit.length - 1, weight = 3; index >= 0; index -= 1) {
    sum += Number(dataWithoutCheckDigit[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

function normalizeDigits(symbology: BarcodeSymbology, plaintext: string) {
  const [digits] = plaintext.split("+");
  const expectedLength = symbology === "ean13" ? 13 : symbology === "ean8" ? 8 : 12;
  const payloadLength = expectedLength - 1;

  if (
    !digits ||
    !/^\d+$/.test(digits) ||
    (digits.length !== payloadLength && digits.length !== expectedLength)
  ) {
    throw new Error(`${symbology} requires ${payloadLength} or ${expectedLength} digits.`);
  }

  const checksumValue = calculateUpcEanChecksum(digits.slice(0, payloadLength));
  if (digits.length === payloadLength)
    return { digits: `${digits}${checksumValue}`, checksumValue };

  if (Number(digits[payloadLength]) !== checksumValue) {
    throw new Error(`Invalid checksum: expected ${checksumValue}.`);
  }
  return { digits, checksumValue };
}

export function encodeEan13(plaintext: string): LinearBarcodeEncoding {
  const normalized = normalizeDigits("ean13", plaintext);
  const digits = normalized.digits;
  const parity = EAN13_PARITY[Number(digits[0])]!;
  let modules = "101";
  for (let index = 1; index <= 6; index += 1) {
    const digit = Number(digits[index]);
    modules += parity[index - 1] === "L" ? L_PATTERNS[digit] : G_PATTERNS[digit];
  }
  modules += "01010";
  for (let index = 7; index <= 12; index += 1) modules += R_PATTERNS[Number(digits[index])];
  modules += "101";
  return {
    plaintext: digits,
    checksumValue: normalized.checksumValue,
    modules,
    moduleCount: modules.length,
  };
}

export function encodeEan8(plaintext: string): LinearBarcodeEncoding {
  const normalized = normalizeDigits("ean8", plaintext);
  const digits = normalized.digits;
  let modules = "101";
  for (let index = 0; index <= 3; index += 1) modules += L_PATTERNS[Number(digits[index])];
  modules += "01010";
  for (let index = 4; index <= 7; index += 1) modules += R_PATTERNS[Number(digits[index])];
  modules += "101";
  return {
    plaintext: digits,
    checksumValue: normalized.checksumValue,
    modules,
    moduleCount: modules.length,
  };
}

export function encodeUpca(plaintext: string): LinearBarcodeEncoding {
  const normalized = normalizeDigits("upca", plaintext);
  const digits = normalized.digits;
  let modules = "101";
  for (let index = 0; index <= 5; index += 1) modules += L_PATTERNS[Number(digits[index])];
  modules += "01010";
  for (let index = 6; index <= 11; index += 1) modules += R_PATTERNS[Number(digits[index])];
  modules += "101";
  return {
    plaintext: digits,
    checksumValue: normalized.checksumValue,
    modules,
    moduleCount: modules.length,
  };
}

export function encodeLinearBarcode(symbology: BarcodeSymbology, plaintext: string) {
  if (symbology === "ean13") return encodeEan13(plaintext);
  if (symbology === "ean8") return encodeEan8(plaintext);
  if (symbology === "upca") return encodeUpca(plaintext);
  throw new Error(`Unsupported linear barcode type: ${symbology}`);
}
