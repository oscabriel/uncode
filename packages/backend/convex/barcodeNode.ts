"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { decodeCode128ImageFromBlob } from "../lib/decodeImage";
import { renderCode128Png } from "../lib/renderPng";
import type { Id } from "./_generated/dataModel";
import { action, type ActionCtx } from "./_generated/server";
import type {
  BarcodeDecodeResult,
  BarcodeEncodeActionResult,
  BarcodeRenderResult,
} from "./lib/barcodeTypes";
import { encodeCode128 as buildCode128Encoding } from "./lib/code128";
import { toLibreBarcode128Text } from "./lib/code128Libre";
import { renderCode128Svg } from "./lib/renderSvg";

async function resolveActorId(ctx: {
  auth: { getUserIdentity(): Promise<{ subject: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? "anonymous";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown barcode processing error.";
}

const svgRenderArgs = {
  moduleWidth: v.optional(v.number()),
  barcodeHeight: v.optional(v.number()),
  quietZoneModules: v.optional(v.number()),
  foreground: v.optional(v.string()),
  background: v.optional(v.string()),
  labelText: v.optional(v.string()),
  labelGap: v.optional(v.number()),
  labelFontSize: v.optional(v.number()),
  labelFontFamily: v.optional(v.string()),
};

const pngRenderArgs = {
  moduleWidth: v.optional(v.number()),
  barcodeHeight: v.optional(v.number()),
  quietZoneModules: v.optional(v.number()),
  foreground: v.optional(v.string()),
  background: v.optional(v.string()),
};

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
  args: { plaintext: string },
): Promise<BarcodeEncodeActionResult> {
  const createdBy = await resolveActorId(ctx);

  try {
    const canonicalEncoding = buildCode128Encoding(args.plaintext);
    const libreText = toLibreBarcode128Text(canonicalEncoding);
    const runId: Id<"barcodeRuns"> = await ctx.runMutation(internal.barcodes.storeSuccessfulRun, {
      kind: "encode",
      createdBy,
      plaintext: canonicalEncoding.plaintext,
      encodedText: libreText.encodedText,
      fontEncoding: libreText.fontEncoding,
      checksumValue: canonicalEncoding.checksumValue,
    });

    return {
      kind: "encode",
      symbology: "code128",
      status: "success",
      plaintext: canonicalEncoding.plaintext,
      encodedText: libreText.encodedText,
      fontEncoding: libreText.fontEncoding,
      canonicalEncoding,
      runId,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const runId: Id<"barcodeRuns"> = await ctx.runMutation(internal.barcodes.storeFailedRun, {
      kind: "encode",
      createdBy,
      plaintext: args.plaintext,
      status: "validation_error",
      errorMessage,
    });

    return {
      kind: "encode",
      symbology: "code128",
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
    options?: {
      moduleWidth?: number;
      barcodeHeight?: number;
      quietZoneModules?: number;
      foreground?: string;
      background?: string;
      labelText?: string;
      labelGap?: number;
      labelFontSize?: number;
      labelFontFamily?: string;
    };
  },
): Promise<BarcodeRenderResult> {
  const createdBy = await resolveActorId(ctx);

  try {
    const canonicalEncoding = buildCode128Encoding(args.plaintext);
    const libreText = toLibreBarcode128Text(canonicalEncoding);
    const rendered = renderCode128Svg(canonicalEncoding, args.options);
    const storedAsset = await storeGeneratedAsset(
      ctx,
      new Blob([rendered.svg], { type: "image/svg+xml;charset=utf-8" }),
    );
    const runId: Id<"barcodeRuns"> = await ctx.runMutation(internal.barcodes.storeSuccessfulRun, {
      kind: "render",
      createdBy,
      plaintext: canonicalEncoding.plaintext,
      encodedText: libreText.encodedText,
      fontEncoding: libreText.fontEncoding,
      checksumValue: canonicalEncoding.checksumValue,
      resultImageStorageId: storedAsset.storageId,
    });

    return {
      kind: "render",
      symbology: "code128",
      status: "success",
      plaintext: canonicalEncoding.plaintext,
      encodedText: libreText.encodedText,
      fontEncoding: libreText.fontEncoding,
      checksumValue: canonicalEncoding.checksumValue,
      imageStorageId: storedAsset.storageId,
      imageUrl: storedAsset.imageUrl,
      canonicalEncoding,
      svg: rendered.svg,
      runId,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const runId: Id<"barcodeRuns"> = await ctx.runMutation(internal.barcodes.storeFailedRun, {
      kind: "render",
      createdBy,
      plaintext: args.plaintext,
      status: "validation_error",
      errorMessage,
    });

    return {
      kind: "render",
      symbology: "code128",
      status: "validation_error",
      plaintext: args.plaintext,
      errorMessage,
      runId,
    };
  }
}

async function handleGenerateCode128Png(
  ctx: ActionCtx,
  args: {
    plaintext: string;
    options?: {
      moduleWidth?: number;
      barcodeHeight?: number;
      quietZoneModules?: number;
      foreground?: string;
      background?: string;
    };
  },
): Promise<BarcodeRenderResult> {
  const createdBy = await resolveActorId(ctx);

  try {
    const canonicalEncoding = buildCode128Encoding(args.plaintext);
    const libreText = toLibreBarcode128Text(canonicalEncoding);
    const rendered = renderCode128Png(canonicalEncoding, args.options);
    const storedAsset = await storeGeneratedAsset(
      ctx,
      new Blob([Uint8Array.from(rendered.pngBytes).buffer], { type: "image/png" }),
    );
    const runId: Id<"barcodeRuns"> = await ctx.runMutation(internal.barcodes.storeSuccessfulRun, {
      kind: "render",
      createdBy,
      plaintext: canonicalEncoding.plaintext,
      encodedText: libreText.encodedText,
      fontEncoding: libreText.fontEncoding,
      checksumValue: canonicalEncoding.checksumValue,
      resultImageStorageId: storedAsset.storageId,
    });

    return {
      kind: "render",
      symbology: "code128",
      status: "success",
      plaintext: canonicalEncoding.plaintext,
      encodedText: libreText.encodedText,
      fontEncoding: libreText.fontEncoding,
      checksumValue: canonicalEncoding.checksumValue,
      imageStorageId: storedAsset.storageId,
      imageUrl: storedAsset.imageUrl,
      canonicalEncoding,
      pngBase64: Buffer.from(rendered.pngBytes).toString("base64"),
      runId,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const runId: Id<"barcodeRuns"> = await ctx.runMutation(internal.barcodes.storeFailedRun, {
      kind: "render",
      createdBy,
      plaintext: args.plaintext,
      status: "validation_error",
      errorMessage,
    });

    return {
      kind: "render",
      symbology: "code128",
      status: "validation_error",
      plaintext: args.plaintext,
      errorMessage,
      runId,
    };
  }
}

async function handleDecodeCode128Image(
  ctx: ActionCtx,
  args: { storageId: Id<"_storage"> },
): Promise<BarcodeDecodeResult> {
  const createdBy = await resolveActorId(ctx);
  const imageBlob = await ctx.storage.get(args.storageId);

  if (!imageBlob) {
    const errorMessage = "The uploaded image could not be found in storage.";
    const runId: Id<"barcodeRuns"> = await ctx.runMutation(internal.barcodes.storeFailedRun, {
      kind: "decode",
      createdBy,
      inputImageStorageId: args.storageId,
      status: "not_found",
      errorMessage,
    });

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
    const runId: Id<"barcodeRuns"> = await ctx.runMutation(internal.barcodes.storeSuccessfulRun, {
      kind: "decode",
      createdBy,
      plaintext: decoded.plaintext,
      inputImageStorageId: args.storageId,
    });

    return {
      kind: "decode",
      symbology: "code128",
      status: "success",
      plaintext: decoded.plaintext,
      imageStorageId: args.storageId,
      imageUrl,
      runId,
    };
  }

  const runId: Id<"barcodeRuns"> = await ctx.runMutation(internal.barcodes.storeFailedRun, {
    kind: "decode",
    createdBy,
    inputImageStorageId: args.storageId,
    status: decoded.status,
    errorMessage: decoded.errorMessage,
  });

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

export const encodeCode128 = action({
  args: {
    plaintext: v.string(),
  },
  handler: handleEncodeCode128,
});

export const generateCode128Svg = action({
  args: {
    plaintext: v.string(),
    options: v.optional(v.object(svgRenderArgs)),
  },
  handler: handleGenerateCode128Svg,
});

export const generateCode128Png = action({
  args: {
    plaintext: v.string(),
    options: v.optional(v.object(pngRenderArgs)),
  },
  handler: handleGenerateCode128Png,
});

export const decodeCode128Image = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: handleDecodeCode128Image,
});
