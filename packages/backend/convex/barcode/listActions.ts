import { v } from "convex/values";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { generateBarcode } from "./generate";
import { normalizeBarcodeRequest } from "./request";
import { barcodeOptionsValidator } from "./validators";

type CreateListResult =
  | { ok: false; failures: { row: number; plaintext: string; errorMessage: string }[] }
  | { ok: true; listId: string; slugKey: string; itemCount: number };

export const createListFromRows = action({
  args: {
    name: v.string(),
    items: v.array(
      v.object({
        name: v.optional(v.string()),
        plaintext: v.string(),
        symbology: v.optional(v.string()),
        options: v.optional(barcodeOptionsValidator),
      }),
    ),
  },
  handler: async (ctx, args): Promise<CreateListResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required to create lists.");
    }

    const listName = args.name.trim();
    if (!listName) throw new Error("List name is required.");
    if (args.items.length < 1 || args.items.length > 500) {
      throw new Error("Lists support between 1 and 500 barcodes.");
    }

    const failures: { row: number; plaintext: string; errorMessage: string }[] = [];
    const encodedItems = await Promise.all(
      args.items.map(async (item, index) => {
        const plaintext = item.plaintext.trim();
        if (!plaintext) {
          failures.push({ row: index + 1, plaintext, errorMessage: "Plaintext value is required." });
          return null;
        }
        try {
          const request = normalizeBarcodeRequest({
            symbology: item.symbology,
            plaintext,
            outputFormat: "json",
            options: item.options,
          });
          const encoded = (await generateBarcode(request)) as {
            plaintext?: string;
            encodedText?: string;
            checksumValue?: number;
          };
          return {
            name: (item.name?.trim() || plaintext).slice(0, 160),
            plaintext: encoded.plaintext ?? request.plaintext,
            encodedText: encoded.encodedText,
            checksumValue: encoded.checksumValue,
            symbology: request.symbology,
            outputFormat: "svg" as const,
            options: item.options,
          };
        } catch (error) {
          failures.push({
            row: index + 1,
            plaintext,
            errorMessage: error instanceof Error ? error.message : "Encoding failed.",
          });
          return null;
        }
      }),
    );

    if (failures.length > 0) {
      return { ok: false as const, failures };
    }

    const result: { listId: string; slugKey: string; itemCount: number } = await ctx.runMutation(
      internal.barcode.lists.persistEncodedList,
      {
      createdBy: identity.tokenIdentifier,
      name: listName.slice(0, 120),
      items: encodedItems.filter((item) => item !== null),
      },
    );

    return { ok: true as const, ...result };
  },
});
