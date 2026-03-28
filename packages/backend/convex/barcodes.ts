import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";

const barcodeRunKind = v.union(v.literal("encode"), v.literal("decode"), v.literal("render"));
const barcodeRunFailureStatus = v.union(
  v.literal("validation_error"),
  v.literal("not_found"),
  v.literal("unsupported_format"),
  v.literal("invalid_image"),
);

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required to upload files.");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const listRecentRuns = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // No identity — the client should show session-based history instead.
      return [];
    }
    const limit = Math.max(1, Math.min(args.limit ?? 10, 25));

    return await ctx.db
      .query("barcodeRuns")
      .withIndex("by_created_by_created_at", (q) => q.eq("createdBy", identity.subject))
      .order("desc")
      .take(limit);
  },
});

export const getBarcodeRun = query({
  args: {
    runId: v.id("barcodeRuns"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const barcodeRun = await ctx.db.get(args.runId);
    if (!barcodeRun || barcodeRun.createdBy !== identity.subject) {
      return null;
    }

    return barcodeRun;
  },
});

export const storeSuccessfulRun = internalMutation({
  args: {
    kind: barcodeRunKind,
    createdBy: v.string(),
    plaintext: v.optional(v.string()),
    encodedText: v.optional(v.string()),
    fontEncoding: v.optional(v.literal("libre-barcode-128")),
    checksumValue: v.optional(v.number()),
    inputImageStorageId: v.optional(v.id("_storage")),
    resultImageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("barcodeRuns", {
      kind: args.kind,
      symbology: "code128",
      plaintext: args.plaintext,
      encodedText: args.encodedText,
      fontEncoding: args.fontEncoding,
      checksumValue: args.checksumValue,
      inputImageStorageId: args.inputImageStorageId,
      resultImageStorageId: args.resultImageStorageId,
      status: "success",
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});

export const storeFailedRun = internalMutation({
  args: {
    kind: barcodeRunKind,
    createdBy: v.string(),
    plaintext: v.optional(v.string()),
    inputImageStorageId: v.optional(v.id("_storage")),
    status: barcodeRunFailureStatus,
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("barcodeRuns", {
      kind: args.kind,
      symbology: "code128",
      plaintext: args.plaintext,
      inputImageStorageId: args.inputImageStorageId,
      status: args.status,
      errorMessage: args.errorMessage,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});
