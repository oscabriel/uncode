import { describe, expect, it } from "vitest";

import { encodeCode128 } from "./code128";
import { toLibreBarcode128Text } from "./code128Libre";

describe("toLibreBarcode128Text", () => {
  it("maps canonical Code 128 output into Libre Barcode 128 glyphs", () => {
    const encoding = encodeCode128("WO20070317");

    expect(toLibreBarcode128Text(encoding)).toEqual({
      encodedText: "\u00ccWO\u00c74'#1q\u00ce",
      fontEncoding: "libre-barcode-128",
    });
  });

  it("produces the expected font string for numeric-only payloads", () => {
    const encoding = encodeCode128("81936910422665342067");

    expect(toLibreBarcode128Text(encoding)).toEqual({
      encodedText: "\u00cdq}e*J:aB4cz\u00ce",
      fontEncoding: "libre-barcode-128",
    });
  });
});
