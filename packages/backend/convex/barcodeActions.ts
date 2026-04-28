/**
 * Pure-computation barcode actions that run in the default Convex V8 runtime.
 * These do NOT need Node.js — they perform only math, string ops, and storage calls.
 * Running in V8 avoids Node.js cold starts (~200–800ms) and is always warm.
 *
 * Node.js-dependent actions (PNG rendering, image decoding) remain in barcodeNode.ts.
 */
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, type ActionCtx } from "./_generated/server";
import { normalizeBarcodeRequest, type BarcodeOptionValue } from "./barcode/request";
import { generateBarcode } from "./barcode/generate";
import { svgRenderArgs, barcodeOptionsValidator } from "./barcode/validators";
import { encodeCode128Request, renderCode128RequestSvg } from "./barcode/symbologies/code128";
import type { BarcodeSymbology } from "./barcode/types";
import type { BarcodeEncodeActionResult, BarcodeRenderResult } from "./lib/barcodeTypes";

type Actor = {
  id: string;
  isAnonymous: boolean;
};

type GenericEncodedBarcode = {
  plaintext?: string;
  encodedText?: string;
  fontEncoding?: "libre-barcode-128";
  checksumValue?: number;
  canonicalEncoding?: BarcodeEncodeActionResult["canonicalEncoding"];
};

type GenericRenderedBarcode = { svg: string; encoded?: GenericEncodedBarcode };

async function resolveActor(ctx: ActionCtx): Promise<Actor> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return { id: "anonymous", isAnonymous: true };
  }
  const isAnonymous: boolean = await ctx.runQuery(internal.auth.isCurrentUserAnonymous);
  return { id: identity.tokenIdentifier, isAnonymous };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown barcode processing error.";
}

function fallbackSymbology(symbology: string | undefined): BarcodeSymbology {
  if (symbology === "qr" || symbology === "ean13" || symbology === "ean8" || symbology === "upca") {
    return symbology;
  }
  return "code128";
}

async function storeGeneratedAsset(
  ctx: ActionCtx,
  body: Blob,
): Promise<{ storageId: Id<"_storage">; imageUrl: string | null }> {
  const storageId = await ctx.storage.store(body);
  const imageUrl = await ctx.storage.getUrl(storageId);

  return {
    storageId,
    imageUrl,
  };
}

async function handleEncodeCode128(
  ctx: ActionCtx,
  args: { plaintext: string; symbology?: string; options?: Record<string, BarcodeOptionValue> },
): Promise<BarcodeEncodeActionResult> {
  const actor = await resolveActor(ctx);

  try {
    const request = normalizeBarcodeRequest({
      symbology: args.symbology,
      plaintext: args.plaintext,
      outputFormat: "json",
      options: args.options,
    });
    const encoded =
      request.symbology === "code128"
        ? encodeCode128Request(request)
        : await generateBarcode(request);
    const encodedRecord = encoded as {
      plaintext?: string;
      encodedText?: string;
      fontEncoding?: "libre-barcode-128";
      checksumValue?: number;
      canonicalEncoding?: BarcodeEncodeActionResult["canonicalEncoding"];
    };

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeSuccessfulRun, {
        kind: "encode",
        symbology: request.symbology,
        outputFormat: request.outputFormat,
        optionsJson: JSON.stringify(request.options),
        createdBy: actor.id,
        plaintext: encodedRecord.plaintext ?? request.plaintext,
        encodedText: encodedRecord.encodedText,
        fontEncoding: encodedRecord.fontEncoding,
        checksumValue: encodedRecord.checksumValue,
      });
    }

    return {
      kind: "encode",
      symbology: "code128",
      status: "success",
      plaintext: encodedRecord.plaintext ?? request.plaintext,
      encodedText: encodedRecord.encodedText,
      fontEncoding: encodedRecord.fontEncoding,
      canonicalEncoding: encodedRecord.canonicalEncoding,
      runId,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeFailedRun, {
        kind: "encode",
        symbology: fallbackSymbology(args.symbology),
        createdBy: actor.id,
        plaintext: args.plaintext,
        status: "validation_error",
        errorMessage,
      });
    }

    return {
      kind: "encode",
      symbology: fallbackSymbology(args.symbology),
      status: "validation_error",
      plaintext: args.plaintext,
      errorMessage,
      runId,
    };
  }
}

async function handleGenerateCode128Svg(
  ctx: ActionCtx,
  args: {
    plaintext: string;
    symbology?: string;
    options?:
      | {
          moduleWidth?: number;
          barcodeHeight?: number;
          quietZoneModules?: number;
          foreground?: string;
          background?: string;
          labelText?: string;
          labelGap?: number;
          labelFontSize?: number;
          labelFontFamily?: string;
        }
      | Record<string, BarcodeOptionValue>;
  },
): Promise<BarcodeRenderResult> {
  const actor = await resolveActor(ctx);

  try {
    const request = normalizeBarcodeRequest({
      symbology: args.symbology,
      plaintext: args.plaintext,
      outputFormat: "svg",
      options: args.options,
    });
    const rendered: GenericRenderedBarcode =
      request.symbology === "code128"
        ? renderCode128RequestSvg(request)
        : ((await generateBarcode(request)) as GenericRenderedBarcode);
    const encoded = rendered.encoded;
    const genericEncoded =
      request.symbology !== "code128"
        ? ((await generateBarcode({ ...request, outputFormat: "json" })) as GenericEncodedBarcode)
        : undefined;
    const svg = rendered.svg;
    const storedAsset = await storeGeneratedAsset(
      ctx,
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeSuccessfulRun, {
        kind: "render",
        symbology: request.symbology,
        outputFormat: request.outputFormat,
        optionsJson: JSON.stringify(request.options),
        createdBy: actor.id,
        plaintext: encoded?.plaintext ?? genericEncoded?.plaintext ?? request.plaintext,
        encodedText: encoded?.encodedText,
        fontEncoding: encoded?.fontEncoding,
        checksumValue: encoded?.checksumValue ?? genericEncoded?.checksumValue,
        resultImageStorageId: storedAsset.storageId,
      });
    }

    return {
      kind: "render",
      symbology: request.symbology,
      status: "success",
      plaintext: encoded?.plaintext ?? genericEncoded?.plaintext ?? request.plaintext,
      encodedText: encoded?.encodedText,
      fontEncoding: encoded?.fontEncoding,
      checksumValue: encoded?.checksumValue ?? genericEncoded?.checksumValue,
      imageStorageId: storedAsset.storageId,
      imageUrl: storedAsset.imageUrl,
      canonicalEncoding: encoded?.canonicalEncoding,
      outputFormat: request.outputFormat,
      svg,
      runId,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeFailedRun, {
        kind: "render",
        symbology: fallbackSymbology(args.symbology),
        createdBy: actor.id,
        plaintext: args.plaintext,
        status: "validation_error",
        errorMessage,
      });
    }

    return {
      kind: "render",
      symbology: fallbackSymbology(args.symbology),
      status: "validation_error",
      plaintext: args.plaintext,
      errorMessage,
      runId,
    };
  }
}

export const encodeCode128 = action({
  args: {
    plaintext: v.string(),
  },
  handler: handleEncodeCode128,
});

export const encodeBarcode = action({
  args: {
    plaintext: v.string(),
    symbology: v.optional(v.string()),
    options: v.optional(barcodeOptionsValidator),
  },
  handler: handleEncodeCode128,
});

export const generateCode128Svg = action({
  args: {
    plaintext: v.string(),
    symbology: v.optional(v.string()),
    options: v.optional(v.object(svgRenderArgs)),
  },
  handler: handleGenerateCode128Svg,
});

export const generateBarcodeSvg = action({
  args: {
    plaintext: v.string(),
    symbology: v.optional(v.string()),
    options: v.optional(barcodeOptionsValidator),
  },
  handler: handleGenerateCode128Svg,
});
