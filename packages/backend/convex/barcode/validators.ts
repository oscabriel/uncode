import { v } from "convex/values";

export const barcodeSymbologyValidator = v.union(
  v.literal("code128"),
  v.literal("qr"),
  v.literal("ean13"),
  v.literal("ean8"),
  v.literal("upca"),
);

export const supportedBarcodeSymbologyValidator = v.literal("code128");

export const barcodeOutputFormatValidator = v.union(
  v.literal("svg"),
  v.literal("png"),
  v.literal("json"),
);

export const barcodeFontEncodingValidator = v.literal("libre-barcode-128");

export const barcodeOptionValueValidator = v.union(v.string(), v.number(), v.boolean());

export const barcodeOptionsValidator = v.record(v.string(), barcodeOptionValueValidator);

export const svgRenderArgs = {
  moduleWidth: v.optional(v.number()),
  barcodeHeight: v.optional(v.number()),
  quietZoneModules: v.optional(v.number()),
  foreground: v.optional(v.string()),
  background: v.optional(v.string()),
  labelText: v.optional(v.string()),
  labelGap: v.optional(v.number()),
  labelFontSize: v.optional(v.number()),
  labelFontFamily: v.optional(v.string()),
};

export const pngRenderArgs = {
  moduleWidth: v.optional(v.number()),
  barcodeHeight: v.optional(v.number()),
  quietZoneModules: v.optional(v.number()),
  foreground: v.optional(v.string()),
  background: v.optional(v.string()),
};
