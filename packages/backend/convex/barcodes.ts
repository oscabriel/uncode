import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";

const barcodeRunKind = v.union(v.literal("encode"), v.literal("decode"), v.literal("render"));
const barcodeRunFailureStatus = v.union(
  v.literal("validation_error"),
  v.literal("not_found"),
  v.literal("unsupported_format"),
  v.literal("invalid_image"),
);

async function resolveActorId(ctx: {
  auth: { getUserIdentity(): Promise<{ subject: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? "anonymous";
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const listRecentRuns = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actorId = await resolveActorId(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 10, 25));

    return await ctx.db
      .query("barcodeRuns")
      .withIndex("by_created_by_created_at", (q) => q.eq("createdBy", actorId))
      .order("desc")
      .take(limit);
  },
});

export const getBarcodeRun = query({
  args: {
    runId: v.id("barcodeRuns"),
  },
  handler: async (ctx, args) => {
    const actorId = await resolveActorId(ctx);
    const barcodeRun = await ctx.db.get(args.runId);

    if (!barcodeRun || barcodeRun.createdBy !== actorId) {
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
