import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";
import type { Id } from "@uncode/backend/convex/_generated/dataModel";
import { Badge, useKumoToastManager } from "@cloudflare/kumo";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Copy, Globe, Lock } from "lucide-react";
import { useState } from "react";

import { env } from "@uncode/env/web";

export const Route = createFileRoute("/lists/$listId")({
  ssr: false,
  component: ListDetailComponent,
});

const SYMBOLOGY_LABEL: Record<string, string> = {
  code128: "Code 128",
  qr: "QR",
  ean13: "EAN-13",
  ean8: "EAN-8",
  upca: "UPC-A",
};

function symbologyLabel(symbology: string) {
  return SYMBOLOGY_LABEL[symbology] ?? symbology;
}

function buildUrl(item: { symbology: string; plaintext: string; optionsJson?: string }) {
  const url = new URL("/barcode/render.svg", env.VITE_CONVEX_SITE_URL);
  url.searchParams.set("type", item.symbology);
  url.searchParams.set("text", item.plaintext);
  if (item.optionsJson) {
    for (const [key, value] of Object.entries(
      JSON.parse(item.optionsJson) as Record<string, unknown>,
    )) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function ListDetailComponent() {
  const { listId } = Route.useParams();
  const listDocId = listId as Id<"barcodeLists">;
  const toasts = useKumoToastManager();
  const data = useQuery(api.barcode.lists.getMyList, { listId: listDocId });
  const updateList = useMutation(api.barcode.lists.updateList);
  const [copied, setCopied] = useState(false);

  if (data === undefined) {
    return (
      <main className="min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 text-sm text-kumo-subtle">
          Loading list…
        </div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-8">
          <Link
            to="/lists"
            className="inline-flex items-center gap-1 text-xs font-medium text-kumo-subtle transition-colors hover:text-kumo-default"
          >
            <ArrowLeft className="size-3" />
            Lists
          </Link>
          <p className="mt-4 text-sm text-kumo-subtle">List not found.</p>
        </div>
      </main>
    );
  }

  const listData = data;
  const isShared = listData.list.isPublicLinkEnabled;
  const shareUrl = `${window.location.origin}/share/list/${listData.list.slugKey}`;

  async function handleToggleShare() {
    await updateList({
      listId: listDocId,
      isPublicLinkEnabled: !listData.list.isPublicLinkEnabled,
    });
    toasts.add({
      title: listData.list.isPublicLinkEnabled ? "Share link disabled." : "Share link enabled.",
      variant: "success",
    });
  }

  async function handleCopyShare() {
    if (!isShared) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toasts.add({ title: "Share link copied.", variant: "success" });
  }

  return (
    <main className="min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
        <div className="space-y-1">
          <Link
            to="/lists"
            className="inline-flex items-center gap-1 text-xs font-medium text-kumo-subtle transition-colors hover:text-kumo-default"
          >
            <ArrowLeft className="size-3" />
            Lists
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{listData.list.name}</h1>
              <p className="mt-1 text-sm text-kumo-subtle">
                {listData.items.length} {listData.items.length === 1 ? "barcode" : "barcodes"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleShare}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-kumo-line bg-kumo-elevated px-3 text-xs font-medium text-kumo-default transition-colors hover:bg-kumo-tint"
            >
              {isShared ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
              {isShared ? "Disable share" : "Enable share"}
            </button>
          </div>
        </div>

        {isShared && (
          <div className="flex items-center gap-2 rounded-xl border border-kumo-line bg-kumo-elevated px-3 py-2">
            <Globe className="size-4 shrink-0 text-kumo-subtle" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-kumo-subtle">
              {shareUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyShare}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-kumo-subtle transition-colors hover:bg-kumo-tint hover:text-kumo-default"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-kumo-success" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        )}

        {listData.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-kumo-line bg-kumo-elevated px-6 py-14 text-center text-sm text-kumo-subtle">
            This list has no barcodes yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {listData.items.map((item) => (
              <article
                key={item._id}
                className="overflow-hidden rounded-xl border border-kumo-line bg-kumo-elevated"
              >
                <div className="flex items-center justify-center bg-white p-5">
                  <img src={buildUrl(item)} alt={item.name} className="max-h-48 object-contain" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="truncate font-medium text-kumo-default">{item.name}</h2>
                    <Badge variant="secondary">{symbologyLabel(item.symbology)}</Badge>
                  </div>
                  <p className="truncate font-mono text-xs text-kumo-subtle">{item.plaintext}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
