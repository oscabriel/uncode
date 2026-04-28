import { createFileRoute } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import { env } from "@uncode/env/web";

export const Route = createFileRoute("/share/$key")({
  ssr: false,
  component: ShareComponent,
});

function buildUrl(item: {
  symbology: string;
  plaintext: string;
  outputFormat: "svg" | "png" | "json";
  optionsJson?: string;
}) {
  const format = item.outputFormat === "png" ? "png" : "svg";
  const url = new URL(`/barcode/render.${format}`, env.VITE_CONVEX_SITE_URL);
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

function ShareComponent() {
  const { key } = Route.useParams();
  const share = useQuery(api.barcode.shares.getShareByKey, { shareKey: key });

  if (share === undefined)
    return <main className="p-8 text-sm text-kumo-subtle">Loading share...</main>;
  if (!share) return <main className="p-8 text-sm text-kumo-subtle">Share not found.</main>;

  return (
    <main className="min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Shared barcodes</h1>
        <div className="space-y-4">
          {share.items.map((item) => (
            <div key={item._id} className="rounded-lg border border-kumo-line bg-kumo-elevated p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium">{item.symbology}</span>
                <span className="font-mono text-kumo-subtle">{item.plaintext}</span>
              </div>
              <div className="bg-white p-4">
                <img src={buildUrl(item)} alt={item.plaintext} className="mx-auto max-h-72" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
