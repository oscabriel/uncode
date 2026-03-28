import {
  CheckCircle2,
  Copy,
  Download,
  FileImage,
  Layers3,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import type {
  BarcodeDecodeResult,
  BarcodeEncodeActionResult,
  BarcodeRenderResult,
} from "@uncode/backend/convex/lib/barcodeTypes";
import { Button } from "@uncode/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@uncode/ui/components/card";

type BarcodeResult = BarcodeEncodeActionResult | BarcodeRenderResult | BarcodeDecodeResult | null;
type CanonicalBarcodeResult = BarcodeEncodeActionResult | BarcodeRenderResult;

function StatusPill({ status }: { status: string }) {
  const isSuccess = status === "success";

  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-medium tracking-[0.24em] uppercase ${
        isSuccess
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          : "border-red-400/30 bg-red-400/10 text-red-200"
      }`}
    >
      {isSuccess ? <CheckCircle2 className="size-3" /> : <TriangleAlert className="size-3" />}
      {status.replaceAll("_", " ")}
    </span>
  );
}

function getTransitionSummary(result: CanonicalBarcodeResult) {
  const transitions = result.canonicalEncoding?.codeSetTransitions ?? [];
  if (transitions.length === 0) {
    return "No mid-stream code set changes";
  }

  return transitions
    .map((transition) => `${transition.toCodeSet} @ ${transition.atInputIndex}`)
    .join(" / ");
}

export default function BarcodeResultCard({
  result,
  isWorking,
  onCopyEncodedText,
  svgDownloadUrl,
  pngDownloadUrl,
  copyReady,
  imagePreviewUrl,
}: {
  result: BarcodeResult;
  isWorking: boolean;
  onCopyEncodedText: () => void;
  svgDownloadUrl?: string;
  pngDownloadUrl?: string;
  copyReady: boolean;
  imagePreviewUrl?: string;
}) {
  if (!result) {
    return (
      <Card className="border border-white/10 bg-zinc-950/70 backdrop-blur-sm">
        <CardHeader className="border-b border-white/10 pb-5">
          <CardTitle className="text-white" style={{ fontFamily: '"Chakra Petch", sans-serif' }}>
            Result panel
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Run an encode, render, or decode action to inspect results, copy the Libre Barcode 128
            text output, and download regenerated SVG or PNG assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-80 items-center justify-center pt-6 text-sm text-zinc-500">
          {isWorking
            ? "Working on your barcode..."
            : "No barcode yet. Start with a sample or enter your own text."}
        </CardContent>
      </Card>
    );
  }

  if (result.kind === "decode") {
    const canRegenerate = Boolean(result.plaintext);

    return (
      <Card className="border border-white/10 bg-zinc-950/70 backdrop-blur-sm">
        <CardHeader className="gap-4 border-b border-white/10 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle
                className="text-white"
                style={{ fontFamily: '"Chakra Petch", sans-serif' }}
              >
                Latest decode result
              </CardTitle>
              <CardDescription className="mt-1 text-zinc-400">
                Uploaded image in, plaintext out. Reuse the recovered value for re-encoding or
                regenerated assets.
              </CardDescription>
            </div>
            <StatusPill status={result.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {result.status !== "success" ? (
            <div className="border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-100">
              {result.errorMessage ?? "Unable to decode the uploaded image."}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
            <div className="overflow-hidden border border-white/10 bg-black/20">
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Decoded upload"
                  className="h-64 w-full object-contain bg-white p-4"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
                  No uploaded image preview available.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2 border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                  <ScanLine className="size-3.5" />
                  Decoded plaintext
                </div>
                <p
                  className="text-lg text-white"
                  style={{ fontFamily: '"Chakra Petch", sans-serif' }}
                >
                  {result.plaintext ?? "-"}
                </p>
              </div>

              <div className="space-y-2 border border-fuchsia-300/20 bg-fuchsia-300/5 p-4 text-sm text-fuchsia-50">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-fuchsia-100/80">
                  <FileImage className="size-3.5" />
                  Decode details
                </div>
                <p>
                  {result.status === "success"
                    ? "ZXing confirmed a Code 128 barcode and returned plaintext successfully."
                    : (result.errorMessage ?? "The image could not be decoded.")}
                </p>
                <p
                  className="break-all text-xs text-fuchsia-100/70"
                  style={{ fontFamily: '"IBM Plex Mono", monospace' }}
                >
                  {result.imageStorageId
                    ? `Storage ID: ${result.imageStorageId}`
                    : "No storage reference returned."}
                </p>
              </div>

              <div className="border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
                Decode returns plaintext and validation state. Use the encode lane to derive
                font-specific Libre Barcode 128 text, or download regenerated SVG/PNG assets from
                the recovered plaintext.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={svgDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex h-10 items-center justify-center gap-2 border px-4 text-sm font-medium transition ${
                canRegenerate && svgDownloadUrl
                  ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  : "pointer-events-none border-white/5 bg-white/5 text-zinc-600"
              }`}
            >
              <Download className="size-4" />
              Download regenerated SVG
            </a>
            <a
              href={pngDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex h-10 items-center justify-center gap-2 border px-4 text-sm font-medium transition ${
                canRegenerate && pngDownloadUrl
                  ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  : "pointer-events-none border-white/5 bg-white/5 text-zinc-600"
              }`}
            >
              <Download className="size-4" />
              Download regenerated PNG
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  const svgMarkup = "svg" in result ? result.svg : undefined;
  const checksumValue =
    result.canonicalEncoding?.checksumValue ??
    ("checksumValue" in result ? result.checksumValue : undefined);

  return (
    <Card className="border border-white/10 bg-zinc-950/70 backdrop-blur-sm">
      <CardHeader className="gap-4 border-b border-white/10 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-white" style={{ fontFamily: '"Chakra Petch", sans-serif' }}>
              Latest result
            </CardTitle>
            <CardDescription className="mt-1 text-zinc-400">
              Plaintext and font-encoded text stay intentionally separate.
            </CardDescription>
          </div>
          <StatusPill status={result.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {result.status !== "success" ? (
          <div className="border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-100">
            {result.errorMessage ?? "Unable to generate a barcode for this input."}
          </div>
        ) : null}

        {svgMarkup ? (
          <div className="overflow-hidden border border-white/10 bg-white p-4">
            <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
          </div>
        ) : (
          <div className="border border-dashed border-white/10 bg-black/20 p-5 text-sm text-zinc-500">
            Run the preview action to render a live SVG barcode here.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
              <ScanLine className="size-3.5" />
              Plaintext
            </div>
            <p className="text-lg text-white" style={{ fontFamily: '"Chakra Petch", sans-serif' }}>
              {result.plaintext ?? "-"}
            </p>
          </div>

          <div className="space-y-3 border border-cyan-300/20 bg-cyan-300/5 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">
              <Layers3 className="size-3.5" />
              Libre Barcode 128 text
            </div>
            <div
              className="break-all text-sm text-cyan-50"
              style={{ fontFamily: '"IBM Plex Mono", monospace' }}
            >
              {result.encodedText ?? "No font string returned yet."}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onCopyEncodedText}
              disabled={!result.encodedText}
              className="h-9 border-cyan-300/20 bg-transparent text-cyan-50 hover:bg-cyan-300/10"
            >
              <Copy className="size-4" />
              {copyReady ? "Copied" : "Copy encoded text"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 text-xs text-zinc-400 sm:grid-cols-3">
          <div className="border border-white/10 bg-black/20 p-3">
            <p className="uppercase tracking-[0.2em] text-zinc-500">Start code</p>
            <p className="mt-2 text-sm text-white">{result.canonicalEncoding?.startCode ?? "-"}</p>
          </div>
          <div className="border border-white/10 bg-black/20 p-3">
            <p className="uppercase tracking-[0.2em] text-zinc-500">Checksum</p>
            <p className="mt-2 text-sm text-white">{checksumValue ?? "-"}</p>
          </div>
          <div className="border border-white/10 bg-black/20 p-3">
            <p className="uppercase tracking-[0.2em] text-zinc-500">Modules</p>
            <p className="mt-2 text-sm text-white">
              {result.canonicalEncoding?.moduleCount ?? "-"}
            </p>
          </div>
        </div>

        <div className="space-y-2 border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
          <p className="uppercase tracking-[0.2em] text-zinc-500">Canonical transitions</p>
          <p>{getTransitionSummary(result)}</p>
          <p
            className="overflow-x-auto whitespace-nowrap text-zinc-300"
            style={{ fontFamily: '"IBM Plex Mono", monospace' }}
          >
            {(result.canonicalEncoding?.codeValues ?? []).join(", ") ||
              "No canonical code values available yet."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={svgDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex h-10 items-center justify-center gap-2 border px-4 text-sm font-medium transition ${
              svgDownloadUrl
                ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                : "pointer-events-none border-white/5 bg-white/5 text-zinc-600"
            }`}
          >
            <Download className="size-4" />
            Download SVG
          </a>
          <a
            href={pngDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex h-10 items-center justify-center gap-2 border px-4 text-sm font-medium transition ${
              pngDownloadUrl
                ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                : "pointer-events-none border-white/5 bg-white/5 text-zinc-600"
            }`}
          >
            <Download className="size-4" />
            Download PNG
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
