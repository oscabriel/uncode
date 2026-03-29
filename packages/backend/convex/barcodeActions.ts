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
import type { BarcodeEncodeActionResult, BarcodeRenderResult } from "./lib/barcodeTypes";
import { encodeCode128 as buildCode128Encoding } from "./lib/code128";
import { toLibreBarcode128Text } from "./lib/code128Libre";
import { renderCode128Svg } from "./lib/renderSvg";

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
  return { id: identity.subject, isAnonymous };
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
  const actor = await resolveActor(ctx);

  try {
    const canonicalEncoding = buildCode128Encoding(args.plaintext);
    const libreText = toLibreBarcode128Text(canonicalEncoding);

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeSuccessfulRun, {
        kind: "encode",
        createdBy: actor.id,
        plaintext: canonicalEncoding.plaintext,
        encodedText: libreText.encodedText,
        fontEncoding: libreText.fontEncoding,
        checksumValue: canonicalEncoding.checksumValue,
      });
    }

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

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeFailedRun, {
        kind: "encode",
        createdBy: actor.id,
        plaintext: args.plaintext,
        status: "validation_error",
        errorMessage,
      });
    }

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
  const actor = await resolveActor(ctx);

  try {
    const canonicalEncoding = buildCode128Encoding(args.plaintext);
    const libreText = toLibreBarcode128Text(canonicalEncoding);
    const rendered = renderCode128Svg(canonicalEncoding, args.options);
    const storedAsset = await storeGeneratedAsset(
      ctx,
      new Blob([rendered.svg], { type: "image/svg+xml;charset=utf-8" }),
    );

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeSuccessfulRun, {
        kind: "render",
        createdBy: actor.id,
        plaintext: canonicalEncoding.plaintext,
        encodedText: libreText.encodedText,
        fontEncoding: libreText.fontEncoding,
        checksumValue: canonicalEncoding.checksumValue,
        resultImageStorageId: storedAsset.storageId,
      });
    }

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

    let runId: Id<"barcodeRuns"> | undefined;
    if (!actor.isAnonymous) {
      runId = await ctx.runMutation(internal.barcodes.storeFailedRun, {
        kind: "render",
        createdBy: actor.id,
        plaintext: args.plaintext,
        status: "validation_error",
        errorMessage,
      });
    }

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
