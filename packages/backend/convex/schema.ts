import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const barcodeRunStatus = v.union(
  v.literal("success"),
  v.literal("validation_error"),
  v.literal("not_found"),
  v.literal("unsupported_format"),
  v.literal("invalid_image"),
);

const barcodeSymbology = v.union(
  v.literal("code128"),
  v.literal("qr"),
  v.literal("ean13"),
  v.literal("ean8"),
  v.literal("upca"),
);

const barcodeOutputFormat = v.union(v.literal("svg"), v.literal("png"), v.literal("json"));

const barcodeFontEncoding = v.union(v.literal("libre-barcode-128"));

export default defineSchema({
  barcodeRuns: defineTable({
    kind: v.union(v.literal("encode"), v.literal("decode"), v.literal("render")),
    symbology: barcodeSymbology,
    outputFormat: v.optional(barcodeOutputFormat),
    optionsJson: v.optional(v.string()),
    typeAlias: v.optional(v.string()),
    plaintext: v.optional(v.string()),
    encodedText: v.optional(v.string()),
    fontEncoding: v.optional(barcodeFontEncoding),
    checksumValue: v.optional(v.number()),
    inputImageStorageId: v.optional(v.id("_storage")),
    resultImageStorageId: v.optional(v.id("_storage")),
    status: barcodeRunStatus,
    errorMessage: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_created_by_created_at", ["createdBy", "createdAt"])
    .index("by_symbology_created_at", ["symbology", "createdAt"]),
  barcodeShares: defineTable({
    shareKey: v.string(),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  }).index("by_share_key", ["shareKey"]),
  barcodeShareItems: defineTable({
    shareId: v.id("barcodeShares"),
    position: v.number(),
    symbology: barcodeSymbology,
    plaintext: v.string(),
    outputFormat: barcodeOutputFormat,
    optionsJson: v.optional(v.string()),
  }).index("by_share_id_position", ["shareId", "position"]),
  barcodeLists: defineTable({
    name: v.string(),
    slugKey: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
    isPublicLinkEnabled: v.boolean(),
  })
    .index("by_created_by_updated_at", ["createdBy", "updatedAt"])
    .index("by_slug_key", ["slugKey"]),
  barcodeListItems: defineTable({
    listId: v.id("barcodeLists"),
    runId: v.id("barcodeRuns"),
    position: v.number(),
    name: v.string(),
    plaintext: v.string(),
    encodedText: v.optional(v.string()),
    checksumValue: v.optional(v.number()),
    symbology: barcodeSymbology,
    outputFormat: barcodeOutputFormat,
    optionsJson: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_list_id_position", ["listId", "position"])
    .index("by_run_id", ["runId"]),
});
