import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const barcodeRunStatus = v.union(
  v.literal("success"),
  v.literal("validation_error"),
  v.literal("not_found"),
  v.literal("unsupported_format"),
  v.literal("invalid_image"),
);

export default defineSchema({
  barcodeRuns: defineTable({
    kind: v.union(v.literal("encode"), v.literal("decode"), v.literal("render")),
    symbology: v.literal("code128"),
    plaintext: v.optional(v.string()),
    encodedText: v.optional(v.string()),
    fontEncoding: v.optional(v.literal("libre-barcode-128")),
    checksumValue: v.optional(v.number()),
    inputImageStorageId: v.optional(v.id("_storage")),
    resultImageStorageId: v.optional(v.id("_storage")),
    status: barcodeRunStatus,
    errorMessage: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index("by_created_by_created_at", ["createdBy", "createdAt"]),
});
