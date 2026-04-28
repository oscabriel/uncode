import { describe, expect, test } from "vitest";

import { calculateUpcEanChecksum, encodeEan13, encodeEan8, encodeUpca } from "./ean";

describe("UPC/EAN encoding", () => {
  test("calculates BarcodeAPI-compatible check digits", () => {
    expect(calculateUpcEanChecksum("123456789012")).toBe(8);
    expect(calculateUpcEanChecksum("0123456")).toBe(5);
    expect(calculateUpcEanChecksum("12345678901")).toBe(2);
  });

  test("encodes EAN-13 and appends missing checksum", () => {
    const encoded = encodeEan13("123456789012");
    expect(encoded.plaintext).toBe("1234567890128");
    expect(encoded.checksumValue).toBe(8);
    expect(encoded.moduleCount).toBe(95);
    expect(encoded.modules).toHaveLength(95);
  });

  test("encodes EAN-8 and UPC-A", () => {
    expect(encodeEan8("0123456").plaintext).toBe("01234565");
    expect(encodeUpca("12345678901").plaintext).toBe("123456789012");
  });

  test("rejects invalid supplied checksums", () => {
    expect(() => encodeEan13("1234567890123")).toThrow("Invalid checksum");
    expect(() => encodeEan8("01234567")).toThrow("Invalid checksum");
    expect(() => encodeUpca("123456789013")).toThrow("Invalid checksum");
  });
});
