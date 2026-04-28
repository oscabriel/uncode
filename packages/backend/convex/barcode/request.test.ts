import { describe, expect, test } from "vitest";

import { normalizeBarcodeRequest } from "./request";
import { resolveBarcodeTypeAlias, selectBarcodeTypeFromData } from "./types";

describe("barcode type registry", () => {
  test("resolves Code 128 aliases", () => {
    expect(resolveBarcodeTypeAlias("128")?.symbology).toBe("code128");
    expect(resolveBarcodeTypeAlias("code-128")?.symbology).toBe("code128");
  });

  test("selects Code 128 from printable ASCII data", () => {
    expect(selectBarcodeTypeFromData("WO20070317")?.symbology).toBe("code128");
  });

  test("selects specific numeric product barcode types by priority", () => {
    expect(selectBarcodeTypeFromData("123456789012")?.symbology).toBe("upca");
    expect(selectBarcodeTypeFromData("1234567890128")?.symbology).toBe("ean13");
    expect(selectBarcodeTypeFromData("01234565")?.symbology).toBe("ean8");
  });
});

describe("normalizeBarcodeRequest", () => {
  test("normalizes defaults as a basic Code 128 SVG request", () => {
    expect(
      normalizeBarcodeRequest({
        plaintext: "SKU12345",
        outputFormat: "svg",
      }),
    ).toMatchObject({
      symbology: "code128",
      plaintext: "SKU12345",
      outputFormat: "svg",
      options: {},
      isCustom: false,
      cost: 2,
    });
  });

  test("drops default options and marks non-default options as custom", () => {
    expect(
      normalizeBarcodeRequest({
        symbology: "code128",
        plaintext: "SKU12345",
        outputFormat: "svg",
        options: {
          moduleWidth: 2,
          barcodeHeight: 96,
        },
      }),
    ).toMatchObject({
      options: { barcodeHeight: 96 },
      isCustom: true,
      cost: 3,
    });
  });

  test("rejects unknown options", () => {
    expect(() =>
      normalizeBarcodeRequest({
        symbology: "code128",
        plaintext: "SKU12345",
        options: { unknown: true },
      }),
    ).toThrow("Unknown option");
  });

  test("parses BarcodeAPI-style Code 128 control character escapes", () => {
    expect(
      normalizeBarcodeRequest({
        symbology: "code128",
        plaintext: "A$$JB",
      }).plaintext,
    ).toBe("A\nB");
  });
});
