"use node";

/**
 * Node.js-dependent barcode actions (PNG rendering, image decoding).
 * Pure-computation actions (encode, SVG) have been moved to barcodeActions.ts
 * to run in the always-warm Convex V8 runtime and avoid Node.js cold starts.
 */
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { decodeCode128ImageFromBlob } from "../lib/decodeImage";
import { renderBinaryModulesPng, renderMatrixPng } from "../lib/renderGenericPng";
import { renderCode128Png } from "../lib/renderPng";
import { normalizeBarcodeRequest } from "./barcode/request";
import { barcodeOptionsValidator, pngRenderArgs } from "./barcode/validators";
import { renderCode128RequestPng } from "./barcode/symbologies/code128";
import { encodeLinearBarcode } from "./barcode/symbologies/ean";
import { encodeQrMatrix } from "./barcode/symbologies/qr";
import type { BarcodeSymbology } from "./barcode/types";
import type { Id } from "./_generated/dataModel";
import { action, type ActionCtx } from "./_generated/server";
import type { BarcodeDecodeResult, BarcodeRenderResult } from "./lib/barcodeTypes";

type Actor = {
  id: string;
  isAnonymous: boolean;
};

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

async function handleGenerateCode128Png(
  ctx: ActionCtx,
  args: {
    plaintext: string;
    symbology?: string;
    options?: {
      moduleWidth?: number;
      barcodeHeight?: number;
      quietZoneModules?: number;
      foreground?: string;
      background?: string;
    };
  },
): Promise<BarcodeRenderResult> {
  const actor = await resolveActor(ctx);

  try {
    const request = normalizeBarcodeRequest({
      symbology: args.symbology,
      plaintext: args.plaintext,
      outputFormat: "png",
      options: args.options,
    });
    const rendered =
      request.symbology === "code128"
        ? await renderCode128RequestPng(request, renderCode128Png)
        : request.symbology === "qr"
          ? {
              ...renderMatrixPng(encodeQrMatrix(request), request.options),
              encoded: { plaintext: request.plaintext },
            }
          : (() => {
              const encoded = encodeLinearBarcode(request.symbology, request.plaintext);
              return { ...renderBinaryModulesPng(encoded, request.options), encoded };
            })();
    const encoded = rendered.encoded as {
      plaintext: string;
      encodedText?: string;
      fontEncoding?: "libre-barcode-128";
      checksumValue?: number;
      canonicalEncoding?: BarcodeRenderResult["canonicalEncoding"];
    };
    const storedAsset = await storeGeneratedAsset(
      ctx,
      new Blob([Uint8Array.from(rendered.pngBytes).buffer], { type: "image/png" }),
    );

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeSuccessfulRun, {
        kind: "render",
        symbology: request.symbology,
        outputFormat: request.outputFormat,
        optionsJson: JSON.stringify(request.options),
        createdBy: actor.id,
        plaintext: encoded.plaintext,
        encodedText: encoded.encodedText,
        fontEncoding: encoded.fontEncoding,
        checksumValue: encoded.checksumValue,
        resultImageStorageId: storedAsset.storageId,
      });
    }

    return {
      kind: "render",
      symbology: request.symbology,
      status: "success",
      plaintext: encoded.plaintext,
      encodedText: encoded.encodedText,
      fontEncoding: encoded.fontEncoding,
      checksumValue: encoded.checksumValue,
      imageStorageId: storedAsset.storageId,
      imageUrl: storedAsset.imageUrl,
      canonicalEncoding: encoded.canonicalEncoding,
      outputFormat: request.outputFormat,
      pngBase64: Buffer.from(rendered.pngBytes).toString("base64"),
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

async function handleDecodeCode128Image(
  ctx: ActionCtx,
  args: { storageId: Id<"_storage">; symbology?: string },
): Promise<BarcodeDecodeResult> {
  const actor = await resolveActor(ctx);
  const imageBlob = await ctx.storage.get(args.storageId);

  if (!imageBlob) {
    const errorMessage = "The uploaded image could not be found in storage.";

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeFailedRun, {
        kind: "decode",
        symbology: "code128",
        createdBy: actor.id,
        inputImageStorageId: args.storageId,
        status: "not_found",
        errorMessage,
      });
    }

    return {
      kind: "decode",
      symbology: "code128",
      status: "not_found",
      imageStorageId: args.storageId,
      errorMessage,
      runId,
    };
  }

  const imageUrl = await ctx.storage.getUrl(args.storageId);
  const decoded = await decodeCode128ImageFromBlob(imageBlob);

  if (decoded.status === "success") {
    const requestedSymbology =
      args.symbology && args.symbology !== "auto" ? fallbackSymbology(args.symbology) : undefined;
    if (requestedSymbology && requestedSymbology !== decoded.symbology) {
      const errorMessage = `The uploaded image is ${decoded.symbology}, not ${requestedSymbology}.`;
      let runId: Id<"barcodeRuns"> | undefined;
      if (!actor.isAnonymous) {
        runId = await ctx.runMutation(internal.barcodes.storeFailedRun, {
          kind: "decode",
          symbology: requestedSymbology,
          createdBy: actor.id,
          plaintext: decoded.plaintext,
          inputImageStorageId: args.storageId,
          status: "unsupported_format",
          errorMessage,
        });
      }
      return {
        kind: "decode",
        symbology: requestedSymbology,
        status: "unsupported_format",
        plaintext: decoded.plaintext,
        format: decoded.format,
        imageStorageId: args.storageId,
        imageUrl,
        errorMessage,
        runId,
      };
    }

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeSuccessfulRun, {
        kind: "decode",
        createdBy: actor.id,
        symbology: decoded.symbology,
        plaintext: decoded.plaintext,
        inputImageStorageId: args.storageId,
      });
    }

    return {
      kind: "decode",
      symbology: decoded.symbology,
      status: "success",
      plaintext: decoded.plaintext,
      format: decoded.format,
      imageStorageId: args.storageId,
      imageUrl,
      runId,
    };
  }

  let runId: Id<"barcodeRuns"> | undefined;
  if (!actor.isAnonymous) {
    runId = await ctx.runMutation(internal.barcodes.storeFailedRun, {
      kind: "decode",
      symbology: "code128",
      createdBy: actor.id,
      inputImageStorageId: args.storageId,
      status: decoded.status,
      errorMessage: decoded.errorMessage,
    });
  }

  return {
    kind: "decode",
    symbology: "code128",
    status: decoded.status,
    imageStorageId: args.storageId,
    imageUrl,
    errorMessage: decoded.errorMessage,
    runId,
  };
}

export const generateCode128Png = action({
  args: {
    plaintext: v.string(),
    symbology: v.optional(v.string()),
    options: v.optional(v.object(pngRenderArgs)),
  },
  handler: handleGenerateCode128Png,
});

export const generateBarcodePng = action({
  args: {
    plaintext: v.string(),
    symbology: v.optional(v.string()),
    options: v.optional(barcodeOptionsValidator),
  },
  handler: handleGenerateCode128Png,
});

export const decodeCode128Image = action({
  args: {
    storageId: v.id("_storage"),
    symbology: v.optional(v.string()),
  },
  handler: handleDecodeCode128Image,
});

export const decodeBarcodeImage = action({
  args: {
    storageId: v.id("_storage"),
    symbology: v.optional(v.string()),
  },
  handler: handleDecodeCode128Image,
});
