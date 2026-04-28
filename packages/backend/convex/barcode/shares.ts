import { v } from "convex/values";

import { mutation, query } from "../_generated/server";
import {
  barcodeOutputFormatValidator,
  barcodeOptionsValidator,
  barcodeSymbologyValidator,
} from "./validators";

function makeShareKey() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}

export const createShare = mutation({
  args: {
    items: v.array(
      v.object({
        symbology: barcodeSymbologyValidator,
        plaintext: v.string(),
        outputFormat: barcodeOutputFormatValidator,
        options: v.optional(barcodeOptionsValidator),
      }),
    ),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.items.length < 1 || args.items.length > 50) {
      throw new Error("Shares must include between 1 and 50 items.");
    }
    const identity = await ctx.auth.getUserIdentity();
    const shareKey = makeShareKey();
    const shareId = await ctx.db.insert("barcodeShares", {
      shareKey,
      createdBy: identity?.tokenIdentifier,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
    await Promise.all(
      args.items.map((item, position) =>
        ctx.db.insert("barcodeShareItems", {
          shareId,
          position,
          symbology: item.symbology,
          plaintext: item.plaintext,
          outputFormat: item.outputFormat,
          optionsJson: item.options ? JSON.stringify(item.options) : undefined,
        }),
      ),
    );
    return { shareKey, shareId };
  },
});

export const getShareByKey = query({
  args: { shareKey: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("barcodeShares")
      .withIndex("by_share_key", (q) => q.eq("shareKey", args.shareKey))
      .unique();
    if (!share) return null;
    if (share.expiresAt && share.expiresAt < Date.now()) return null;
    const items = await ctx.db
      .query("barcodeShareItems")
      .withIndex("by_share_id_position", (q) => q.eq("shareId", share._id))
      .order("asc")
      .take(50);
    return { share, items };
  },
});
