import { CheckCircle2, Copy, Download, TriangleAlert } from "lucide-react";
import type {
  BarcodeDecodeResult,
  BarcodeEncodeActionResult,
  BarcodeRenderResult,
} from "@uncode/backend/convex/lib/barcodeTypes";
import { Badge, buttonVariants, cn } from "@cloudflare/kumo";
import { useState } from "react";

type BarcodeResult = BarcodeEncodeActionResult | BarcodeRenderResult | BarcodeDecodeResult | null;

export default function BarcodeResultCard({
  result,
  svgDownloadUrl,
  pngDownloadUrl,
  imagePreviewUrl,
}: {
  result: BarcodeResult;
  svgDownloadUrl?: string;
  pngDownloadUrl?: string;
  imagePreviewUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const isSuccess = result.status === "success";
  const svgMarkup = "svg" in result ? result.svg : undefined;
  const encodedText = "encodedText" in result ? result.encodedText : undefined;

  async function handleCopyEncoded() {
    if (!encodedText) return;
    await navigator.clipboard.writeText(encodedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-kumo-line bg-kumo-elevated">
      {svgMarkup ? (
        <div className="bg-white p-6">
          <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
        </div>
      ) : imagePreviewUrl ? (
        <div className="bg-white">
          <img src={imagePreviewUrl} alt="Barcode" className="h-48 w-full object-contain p-4" />
        </div>
      ) : null}

      <div className="space-y-4 p-5">
        {!isSuccess && (
          <div className="rounded-md bg-kumo-danger/10 px-4 py-3 text-sm text-kumo-danger">
            {result.errorMessage ?? "Something went wrong."}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {result.plaintext && <span className="font-mono text-sm">{result.plaintext}</span>}
          </div>
          <Badge variant={isSuccess ? "success" : "destructive"}>
            {isSuccess ? <CheckCircle2 className="size-3" /> : <TriangleAlert className="size-3" />}
            {isSuccess ? "Success" : "Failed"}
          </Badge>
        </div>

        {encodedText && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-kumo-recessed px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs text-kumo-subtle">Libre Barcode 128</p>
              <p className="mt-0.5 truncate font-mono text-sm">{encodedText}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyEncoded}
              className="shrink-0 rounded-md p-1.5 text-kumo-subtle transition-colors hover:bg-kumo-tint hover:text-kumo-default"
            >
              {copied ? (
                <CheckCircle2 className="size-4 text-kumo-success" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        )}

        <div className="flex gap-2.5">
          <a
            href={svgDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              !svgDownloadUrl && "pointer-events-none opacity-40",
            )}
          >
            <Download className="size-3.5" />
            SVG
          </a>
          <a
            href={pngDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              !pngDownloadUrl && "pointer-events-none opacity-40",
            )}
          >
            <Download className="size-3.5" />
            PNG
          </a>
        </div>
      </div>
    </div>
  );
}
