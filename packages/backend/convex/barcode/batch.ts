import { v } from "convex/values";

import { action } from "../_generated/server";
import { normalizeBarcodeRequest } from "./request";
import { barcodeOptionsValidator } from "./validators";
import { generateBarcode } from "./generate";

export const batchEncodeBarcodes = action({
  args: {
    items: v.array(
      v.object({
        plaintext: v.string(),
        symbology: v.optional(v.string()),
        options: v.optional(barcodeOptionsValidator),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    if (args.items.length < 1 || args.items.length > 100) {
      throw new Error("Batch encode supports between 1 and 100 items.");
    }
    return await Promise.all(
      args.items.map(async (item) => {
        try {
          const request = normalizeBarcodeRequest({
            symbology: item.symbology,
            plaintext: item.plaintext,
            outputFormat: "json",
            options: item.options,
          });
          const encoded = (await generateBarcode(request)) as {
            plaintext?: string;
            encodedText?: string;
            checksumValue?: number;
          };
          return {
            plaintext: encoded.plaintext ?? request.plaintext,
            symbology: request.symbology,
            status: "success" as const,
            encodedText: encoded.encodedText,
            checksumValue: encoded.checksumValue,
          };
        } catch (error) {
          return {
            plaintext: item.plaintext,
            symbology: item.symbology ?? "auto",
            status: "validation_error" as const,
            errorMessage: error instanceof Error ? error.message : "Encoding failed.",
          };
        }
      }),
    );
  },
});
