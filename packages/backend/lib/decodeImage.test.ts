import { decode as decodePng } from "fast-png";
import jpeg from "jpeg-js";
import { describe, expect, it } from "vitest";

import { encodeCode128 } from "../convex/lib/code128";
import { decodeCode128ImageFromBlob } from "./decodeImage";
import { renderCode128Png } from "./renderPng";

describe("decodeCode128ImageFromBlob", () => {
  it("roundtrips a generated Code 128 PNG back to plaintext", async () => {
    const encoding = encodeCode128("WO20070317");
    const rendered = renderCode128Png(encoding, {
      moduleWidth: 4,
      barcodeHeight: 112,
      quietZoneModules: 12,
    });
    const pngBody = Uint8Array.from(rendered.pngBytes).buffer;

    const result = await decodeCode128ImageFromBlob(new Blob([pngBody], { type: "image/png" }));

    expect(result).toEqual({
      status: "success",
      plaintext: "WO20070317",
    });
  });

  it("can decode a JPEG upload of the same barcode", async () => {
    const encoding = encodeCode128("81936910422665342067");
    const rendered = renderCode128Png(encoding, {
      moduleWidth: 4,
      barcodeHeight: 112,
      quietZoneModules: 12,
    });
    const decodedPng = decodePng(rendered.pngBytes);
    const jpegBuffer = jpeg.encode(
      {
        width: decodedPng.width,
        height: decodedPng.height,
        data: Buffer.from(decodedPng.data as Uint8Array),
      },
      95,
    ).data;
    const jpegBody = Uint8Array.from(jpegBuffer).buffer;

    const result = await decodeCode128ImageFromBlob(new Blob([jpegBody], { type: "image/jpeg" }));

    expect(result).toEqual({
      status: "success",
      plaintext: "81936910422665342067",
    });
  });

  it("returns not_found for clean images without a barcode", async () => {
    const blankPng = new Uint8Array(
      renderCode128Png(encodeCode128("111111"), {
        moduleWidth: 1,
        barcodeHeight: 1,
        quietZoneModules: 1,
        foreground: "#ffffff",
        background: "#ffffff",
      }).pngBytes,
    );

    const result = await decodeCode128ImageFromBlob(new Blob([blankPng], { type: "image/png" }));

    expect(result).toEqual({
      status: "not_found",
      errorMessage: "No decodable barcode was found in the uploaded image.",
    });
  });

  it("returns unsupported_format for non-image uploads", async () => {
    const result = await decodeCode128ImageFromBlob(
      new Blob(["not an image"], { type: "text/plain" }),
    );

    expect(result).toEqual({
      status: "unsupported_format",
      errorMessage: "Unsupported image format. Please upload a PNG or JPEG barcode image.",
    });
  });
});
