import { convexQuery } from "@convex-dev/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";
import type {
  BarcodeDecodeResult,
  BarcodeEncodeActionResult,
  BarcodeRenderResult,
} from "@uncode/backend/convex/lib/barcodeTypes";
import { Card, CardDescription, CardHeader, CardTitle } from "@uncode/ui/components/card";
import { useAction, useMutation } from "convex/react";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import BarcodeDecodeForm from "@/components/barcode-decode-form";
import BarcodeEncodeForm from "@/components/barcode-encode-form";
import BarcodeHistoryList from "@/components/barcode-history-list";
import BarcodeResultCard from "@/components/barcode-result-card";
import { env } from "@uncode/env/web";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Uncode | Code 128 Workbench",
      },
    ],
  }),
  component: HomeComponent,
});

const HEALTH_QUERY = convexQuery(api.healthCheck.get, {});
const HISTORY_LIMIT = 8;
const RECENT_RUNS_QUERY = convexQuery(api.barcodes.listRecentRuns, { limit: HISTORY_LIMIT });

function buildBarcodeAssetUrl(format: "svg" | "png", plaintext: string) {
  const url = new URL(`/barcode/code128.${format}`, env.VITE_CONVEX_SITE_URL);
  url.searchParams.set("text", plaintext);
  url.searchParams.set("moduleWidth", format === "svg" ? "3" : "4");
  url.searchParams.set("barcodeHeight", format === "svg" ? "96" : "112");
  url.searchParams.set("quietZoneModules", "12");

  if (format === "svg") {
    url.searchParams.set("label", "true");
  }

  return url.toString();
}

function HomeComponent() {
  const queryClient = useQueryClient();
  const healthCheck = useQuery(HEALTH_QUERY);
  const recentRuns = useQuery(RECENT_RUNS_QUERY);
  const generateUploadUrl = useMutation(api.barcodes.generateUploadUrl);
  const encodeCode128 = useAction(api.barcodeNode.encodeCode128);
  const generateCode128Svg = useAction(api.barcodeNode.generateCode128Svg);
  const decodeCode128Image = useAction(api.barcodeNode.decodeCode128Image);
  const [plaintext, setPlaintext] = useState("WO20070317");
  const [pendingAction, setPendingAction] = useState<"encode" | "preview" | "decode" | null>(null);
  const [result, setResult] = useState<
    BarcodeEncodeActionResult | BarcodeRenderResult | BarcodeDecodeResult | null
  >(null);
  const [copyReady, setCopyReady] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [decodePreviewUrl, setDecodePreviewUrl] = useState<string>();

  useEffect(() => {
    if (!selectedFile) {
      setDecodePreviewUrl(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setDecodePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const svgDownloadUrl = useMemo(() => {
    if (result?.kind === "render" && result.svg && result.imageUrl) {
      return result.imageUrl;
    }

    return result?.plaintext ? buildBarcodeAssetUrl("svg", result.plaintext) : undefined;
  }, [result]);

  const pngDownloadUrl = useMemo(() => {
    return result?.plaintext ? buildBarcodeAssetUrl("png", result.plaintext) : undefined;
  }, [result?.plaintext]);

  async function refreshHistory() {
    await queryClient.invalidateQueries({ queryKey: RECENT_RUNS_QUERY.queryKey });
  }

  async function handleEncode() {
    const nextPlaintext = plaintext.trim();
    if (!nextPlaintext) {
      toast.error("Enter some plaintext first.");
      return;
    }

    setPendingAction("encode");
    setCopyReady(false);

    try {
      const nextResult = await encodeCode128({ plaintext: nextPlaintext });
      setResult(nextResult);
      await refreshHistory();

      if (nextResult.status === "success") {
        toast.success("Font-encoded text is ready.");
      } else {
        toast.error(nextResult.errorMessage ?? "Encoding failed.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to encode plaintext.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleGeneratePreview() {
    const nextPlaintext = plaintext.trim();
    if (!nextPlaintext) {
      toast.error("Enter some plaintext first.");
      return;
    }

    setPendingAction("preview");
    setCopyReady(false);

    try {
      const nextResult = await generateCode128Svg({
        plaintext: nextPlaintext,
        options: {
          moduleWidth: 3,
          barcodeHeight: 96,
          quietZoneModules: 12,
          labelText: nextPlaintext,
          labelGap: 12,
          labelFontSize: 15,
          foreground: "#111111",
          background: "#ffffff",
        },
      });
      setResult(nextResult);
      await refreshHistory();

      if (nextResult.status === "success") {
        toast.success("Barcode preview generated.");
      } else {
        toast.error(nextResult.errorMessage ?? "Barcode preview failed.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to render barcode preview.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCopyEncodedText() {
    if (!result || !("encodedText" in result) || !result.encodedText) {
      return;
    }

    await navigator.clipboard.writeText(result.encodedText);
    setCopyReady(true);
    toast.success("Libre Barcode 128 text copied.");
    window.setTimeout(() => setCopyReady(false), 1800);
  }

  async function handleDecodeUpload() {
    if (!selectedFile) {
      toast.error("Choose a PNG or JPEG barcode image first.");
      return;
    }

    setPendingAction("decode");
    setCopyReady(false);

    try {
      const uploadUrl = await generateUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Image upload failed before decode could start.");
      }

      const uploadResult = (await uploadResponse.json()) as { storageId?: string };
      if (!uploadResult.storageId) {
        throw new Error("The upload completed without returning a storage ID.");
      }

      const nextResult = await decodeCode128Image({ storageId: uploadResult.storageId as never });
      setResult(nextResult);
      await refreshHistory();

      if (nextResult.status === "success") {
        if (nextResult.plaintext) {
          setPlaintext(nextResult.plaintext);
        }
        toast.success("Barcode decoded successfully.");
      } else {
        toast.error(nextResult.errorMessage ?? "Unable to decode this image.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload and decode this image.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="min-h-0 overflow-y-auto bg-black text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(251,191,36,0.14),_transparent_22%),linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent_55%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-cyan-100">
                <Sparkles className="size-3.5" />
                Barcode uncoder POC
              </div>
              <div className="space-y-4">
                <h1
                  className="max-w-4xl text-4xl leading-none text-white sm:text-5xl lg:text-6xl"
                  style={{ fontFamily: '"Chakra Petch", sans-serif' }}
                >
                  Encode plain text, inspect the canonical barcode, and ship SVG or PNG assets from
                  one workbench.
                </h1>
                <p className="max-w-2xl text-base text-zinc-400 sm:text-lg">
                  Encode and custom rendering are live, and the decode path now uploads clean
                  barcode images into Convex storage before running ZXing in a Node action.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <Card className="border border-white/10 bg-white/5">
                <CardHeader className="pb-2">
                  <CardDescription className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    API status
                  </CardDescription>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <span
                      className={`size-2 rounded-full ${healthCheck.data === "OK" ? "bg-emerald-400" : healthCheck.isLoading ? "bg-amber-300" : "bg-red-400"}`}
                    />
                    {healthCheck.isLoading
                      ? "Checking"
                      : healthCheck.data === "OK"
                        ? "Connected"
                        : "Offline"}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border border-white/10 bg-white/5">
                <CardHeader className="pb-2">
                  <CardDescription className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    Stored runs
                  </CardDescription>
                  <CardTitle className="text-white">{recentRuns.data?.length ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border border-white/10 bg-white/5">
                <CardHeader className="pb-2">
                  <CardDescription className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    Current focus
                  </CardDescription>
                  <CardTitle className="text-white">Encode + decode</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <BarcodeEncodeForm
              plaintext={plaintext}
              onPlaintextChange={setPlaintext}
              onEncode={handleEncode}
              onGeneratePreview={handleGeneratePreview}
              pendingAction={pendingAction === "decode" ? null : pendingAction}
            />

            <BarcodeResultCard
              result={result}
              isWorking={pendingAction !== null}
              onCopyEncodedText={handleCopyEncodedText}
              svgDownloadUrl={svgDownloadUrl}
              pngDownloadUrl={pngDownloadUrl}
              copyReady={copyReady}
              imagePreviewUrl={
                result?.kind === "decode" ? (result.imageUrl ?? decodePreviewUrl) : undefined
              }
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
            <BarcodeDecodeForm
              selectedFile={selectedFile}
              previewUrl={decodePreviewUrl}
              onFileChange={setSelectedFile}
              onDecode={handleDecodeUpload}
              isDecoding={pendingAction === "decode"}
            />

            <BarcodeHistoryList runs={recentRuns.data} isLoading={recentRuns.isLoading} />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Libre output is derived",
                body: "The copyable string is for Libre Barcode 128 specifically. It is not the canonical barcode source of truth.",
              },
              {
                title: "Custom renderer stays in-house",
                body: "SVG and PNG output now come from our own bar/space module stream, not a third-party barcode generator.",
              },
              {
                title: "Decode pipeline is connected",
                body: "Uploads now land in Convex storage before ZXing attempts a Code 128 decode with explicit failure states.",
              },
            ].map((item) => (
              <Card key={item.title} className="border border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle
                    className="text-white"
                    style={{ fontFamily: '"Chakra Petch", sans-serif' }}
                  >
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-zinc-400">{item.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
