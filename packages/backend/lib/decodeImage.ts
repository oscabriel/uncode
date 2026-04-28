import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  NotFoundException,
  RGBLuminanceSource,
} from "@zxing/library";
import { decode as decodePng, hasPngSignature } from "fast-png";
import jpeg from "jpeg-js";

type SupportedImageFormat = "png" | "jpeg";

type LoadedImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

type DecodedCode128ImageResult =
  | {
      status: "success";
      plaintext: string;
      format: string;
      symbology: "code128" | "ean13" | "ean8" | "upca" | "qr";
    }
  | { status: "not_found"; errorMessage: string }
  | { status: "unsupported_format"; errorMessage: string }
  | { status: "invalid_image"; errorMessage: string };

const ZXING_FORMAT_HINTS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODABAR,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.ITF,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.QR_CODE,
] as const;

function detectImageFormat(bytes: Uint8Array, contentType?: string) {
  const normalizedType = contentType?.toLowerCase();
  if (normalizedType === "image/png") {
    return "png" satisfies SupportedImageFormat;
  }

  if (
    normalizedType === "image/jpeg" ||
    normalizedType === "image/jpg" ||
    normalizedType === "image/pjpeg"
  ) {
    return "jpeg" satisfies SupportedImageFormat;
  }

  if (hasPngSignature(bytes)) {
    return "png" satisfies SupportedImageFormat;
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg" satisfies SupportedImageFormat;
  }

  return null;
}

function normalizeSample(value: number) {
  return Math.max(0, Math.min(255, value));
}

function normalizePngToRgba(
  data: Uint8Array | Uint8ClampedArray | Uint16Array,
  channels: number,
  depth: 8 | 16,
) {
  const pixelCount = data.length / channels;
  const rgba = new Uint8ClampedArray(pixelCount * 4);

  const readSample = (index: number) => {
    const value = data[index]!;
    return depth === 16 ? normalizeSample(value >> 8) : normalizeSample(value);
  };

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const sourceOffset = pixelIndex * channels;
    const targetOffset = pixelIndex * 4;

    if (channels === 4) {
      rgba[targetOffset] = readSample(sourceOffset);
      rgba[targetOffset + 1] = readSample(sourceOffset + 1);
      rgba[targetOffset + 2] = readSample(sourceOffset + 2);
      rgba[targetOffset + 3] = readSample(sourceOffset + 3);
      continue;
    }

    if (channels === 3) {
      rgba[targetOffset] = readSample(sourceOffset);
      rgba[targetOffset + 1] = readSample(sourceOffset + 1);
      rgba[targetOffset + 2] = readSample(sourceOffset + 2);
      rgba[targetOffset + 3] = 255;
      continue;
    }

    if (channels === 2) {
      const gray = readSample(sourceOffset);
      rgba[targetOffset] = gray;
      rgba[targetOffset + 1] = gray;
      rgba[targetOffset + 2] = gray;
      rgba[targetOffset + 3] = readSample(sourceOffset + 1);
      continue;
    }

    const gray = readSample(sourceOffset);
    rgba[targetOffset] = gray;
    rgba[targetOffset + 1] = gray;
    rgba[targetOffset + 2] = gray;
    rgba[targetOffset + 3] = 255;
  }

  return rgba;
}

function loadPng(bytes: Uint8Array): LoadedImage {
  const decoded = decodePng(bytes);

  if (decoded.depth !== 8 && decoded.depth !== 16) {
    throw new Error(`Unsupported PNG color depth ${decoded.depth}.`);
  }

  if (decoded.channels < 1 || decoded.channels > 4) {
    throw new Error(`Unsupported PNG channel count ${decoded.channels}.`);
  }

  return {
    width: decoded.width,
    height: decoded.height,
    rgba: normalizePngToRgba(decoded.data, decoded.channels, decoded.depth),
  };
}

function loadJpeg(bytes: Uint8Array): LoadedImage {
  const decoded = jpeg.decode(bytes, {
    useTArray: true,
    formatAsRGBA: true,
    tolerantDecoding: true,
  });

  return {
    width: decoded.width,
    height: decoded.height,
    rgba: new Uint8ClampedArray(
      decoded.data.buffer,
      decoded.data.byteOffset,
      decoded.data.byteLength,
    ),
  };
}

function loadImage(bytes: Uint8Array, contentType?: string): LoadedImage {
  const format = detectImageFormat(bytes, contentType);

  if (!format) {
    throw new Error("Unsupported image format. Please upload a PNG or JPEG barcode image.");
  }

  return format === "png" ? loadPng(bytes) : loadJpeg(bytes);
}

function createReader() {
  const reader = new MultiFormatReader();
  const hints = new Map<DecodeHintType, unknown>();

  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [...ZXING_FORMAT_HINTS]);
  reader.setHints(hints);

  return reader;
}

function rgbaToArgbInt32(rgba: Uint8ClampedArray) {
  const pixelCount = rgba.length / 4;
  const argb = new Int32Array(pixelCount);

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const alpha = rgba[offset + 3] ?? 255;
    const red = rgba[offset] ?? 0;
    const green = rgba[offset + 1] ?? 0;
    const blue = rgba[offset + 2] ?? 0;

    argb[pixelIndex] =
      ((alpha & 0xff) << 24) | ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff);
  }

  return argb;
}

function decodeBitmap(rgba: Uint8ClampedArray, width: number, height: number) {
  const reader = createReader();
  const luminanceSource = new RGBLuminanceSource(rgbaToArgbInt32(rgba), width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

  try {
    return reader.decodeWithState(bitmap);
  } catch (error) {
    if (!(error instanceof NotFoundException)) {
      throw error;
    }

    return reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(luminanceSource.invert())));
  } finally {
    reader.reset();
  }
}

function mapZxingFormat(format: BarcodeFormat) {
  if (format === BarcodeFormat.CODE_128) return "code128";
  if (format === BarcodeFormat.EAN_13) return "ean13";
  if (format === BarcodeFormat.EAN_8) return "ean8";
  if (format === BarcodeFormat.UPC_A) return "upca";
  if (format === BarcodeFormat.QR_CODE) return "qr";
  return null;
}

export async function decodeCode128ImageFromBlob(blob: Blob): Promise<DecodedCode128ImageResult> {
  const bytes = new Uint8Array(await blob.arrayBuffer());

  try {
    const image = loadImage(bytes, blob.type);
    const decoded = decodeBitmap(image.rgba, image.width, image.height);

    const symbology = mapZxingFormat(decoded.getBarcodeFormat());
    if (!symbology) {
      return {
        status: "unsupported_format",
        errorMessage: "The uploaded image contains a barcode, but it is not a supported format.",
      };
    }

    return {
      status: "success",
      plaintext: decoded.getText(),
      format: BarcodeFormat[decoded.getBarcodeFormat()] ?? String(decoded.getBarcodeFormat()),
      symbology,
    };
  } catch (error) {
    if (error instanceof NotFoundException) {
      return {
        status: "not_found",
        errorMessage: "No decodable barcode was found in the uploaded image.",
      };
    }

    if (error instanceof Error && error.message.includes("Unsupported image format")) {
      return {
        status: "unsupported_format",
        errorMessage: error.message,
      };
    }

    return {
      status: "invalid_image",
      errorMessage:
        error instanceof Error
          ? error.message
          : "The uploaded file could not be parsed as a valid image.",
    };
  }
}
