import { v } from "convex/values";

import { internalMutation, mutation, query, type MutationCtx } from "../_generated/server";
import {
  barcodeOptionsValidator,
  barcodeOutputFormatValidator,
  barcodeSymbologyValidator,
} from "./validators";

function makeSlugKey() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}

async function requireUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required.");
  }
  return identity.tokenIdentifier;
}

export const listMyLists = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
    const lists = await ctx.db
      .query("barcodeLists")
      .withIndex("by_created_by_updated_at", (q) => q.eq("createdBy", identity.tokenIdentifier))
      .order("desc")
      .take(limit);

    return await Promise.all(
      lists
        .filter((list) => !list.deletedAt)
        .map(async (list) => {
          const items = await ctx.db
            .query("barcodeListItems")
            .withIndex("by_list_id_position", (q) => q.eq("listId", list._id))
            .take(500);
          return { ...list, itemCount: items.length };
        }),
    );
  },
});

export const getMyList = query({
  args: { listId: v.id("barcodeLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const list = await ctx.db.get(args.listId);
    if (!list || list.deletedAt || list.createdBy !== identity.tokenIdentifier) return null;
    const items = await ctx.db
      .query("barcodeListItems")
      .withIndex("by_list_id_position", (q) => q.eq("listId", list._id))
      .order("asc")
      .take(500);
    return { list, items };
  },
});

export const getPublicListByKey = query({
  args: { slugKey: v.string() },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("barcodeLists")
      .withIndex("by_slug_key", (q) => q.eq("slugKey", args.slugKey))
      .unique();
    if (!list || list.deletedAt || !list.isPublicLinkEnabled) return null;
    const items = await ctx.db
      .query("barcodeListItems")
      .withIndex("by_list_id_position", (q) => q.eq("listId", list._id))
      .order("asc")
      .take(500);
    return { list, items };
  },
});

export const updateList = mutation({
  args: {
    listId: v.id("barcodeLists"),
    name: v.optional(v.string()),
    isPublicLinkEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const createdBy = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.deletedAt || list.createdBy !== createdBy) {
      throw new Error("List not found.");
    }
    const patch: { name?: string; isPublicLinkEnabled?: boolean; updatedAt: number } = {
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("List name is required.");
      patch.name = name.slice(0, 120);
    }
    if (args.isPublicLinkEnabled !== undefined) {
      patch.isPublicLinkEnabled = args.isPublicLinkEnabled;
    }
    await ctx.db.patch(args.listId, patch);
  },
});

export const renameListItem = mutation({
  args: { itemId: v.id("barcodeListItems"), name: v.string() },
  handler: async (ctx, args) => {
    const createdBy = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("List item not found.");
    const list = await ctx.db.get(item.listId);
    if (!list || list.deletedAt || list.createdBy !== createdBy) {
      throw new Error("List item not found.");
    }
    const name = args.name.trim();
    if (!name) throw new Error("Item name is required.");
    await ctx.db.patch(args.itemId, { name: name.slice(0, 160) });
    await ctx.db.patch(item.listId, { updatedAt: Date.now() });
  },
});

export const deleteList = mutation({
  args: { listId: v.id("barcodeLists") },
  handler: async (ctx, args) => {
    const createdBy = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.deletedAt || list.createdBy !== createdBy) {
      throw new Error("List not found.");
    }
    await ctx.db.patch(args.listId, { deletedAt: Date.now(), updatedAt: Date.now() });
  },
});

export const persistEncodedList = internalMutation({
  args: {
    createdBy: v.string(),
    name: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        plaintext: v.string(),
        encodedText: v.optional(v.string()),
        checksumValue: v.optional(v.number()),
        symbology: barcodeSymbologyValidator,
        outputFormat: barcodeOutputFormatValidator,
        options: v.optional(barcodeOptionsValidator),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const listId = await ctx.db.insert("barcodeLists", {
      name: args.name,
      slugKey: makeSlugKey(),
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      isPublicLinkEnabled: false,
    });
    const list = await ctx.db.get(listId);
    if (!list) throw new Error("Failed to create list.");

    for (const [position, item] of args.items.entries()) {
      const optionsJson = item.options ? JSON.stringify(item.options) : undefined;
      const runId = await ctx.db.insert("barcodeRuns", {
        kind: "encode",
        symbology: item.symbology,
        outputFormat: item.outputFormat,
        optionsJson,
        plaintext: item.plaintext,
        encodedText: item.encodedText,
        checksumValue: item.checksumValue,
        status: "success",
        createdBy: args.createdBy,
        createdAt: now + position,
      });
      await ctx.db.insert("barcodeListItems", {
        listId,
        runId,
        position,
        name: item.name,
        plaintext: item.plaintext,
        encodedText: item.encodedText,
        checksumValue: item.checksumValue,
        symbology: item.symbology,
        outputFormat: item.outputFormat,
        optionsJson,
        createdAt: now,
      });
    }

    return { listId, slugKey: list.slugKey, itemCount: args.items.length };
  },
});
