import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";
import { Badge } from "@cloudflare/kumo";
import { useQuery } from "convex/react";
import { Printer } from "lucide-react";

import { env } from "@uncode/env/web";

export const Route = createFileRoute("/share/list/$key")({
  ssr: false,
  component: PublicListComponent,
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

function PublicListComponent() {
  const { key } = Route.useParams();
  const data = useQuery(api.barcode.lists.getPublicListByKey, { slugKey: key });

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
        <div className="mx-auto w-full max-w-4xl space-y-3 px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight">List unavailable</h1>
          <p className="text-sm text-kumo-subtle">
            This shared list isn’t available. The owner may have disabled the public link.
          </p>
          <Link
            to="/"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-kumo-line bg-kumo-elevated px-3 text-xs font-medium text-kumo-default transition-colors hover:bg-kumo-tint"
          >
            Go to Uncode
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-kumo-subtle">
              Shared list
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{data.list.name}</h1>
            <p className="mt-1 text-sm text-kumo-subtle">
              {data.items.length} {data.items.length === 1 ? "barcode" : "barcodes"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-kumo-line bg-kumo-elevated px-3 text-xs font-medium text-kumo-default transition-colors hover:bg-kumo-tint print:hidden"
          >
            <Printer className="size-3.5" />
            Print
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {data.items.map((item) => (
            <article
              key={item._id}
              className="overflow-hidden rounded-xl border border-kumo-line bg-kumo-elevated print:break-inside-avoid"
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

        <p className="pt-4 text-center text-xs text-kumo-subtle print:hidden">
          Shared with{" "}
          <Link to="/" className="font-medium text-kumo-link hover:text-kumo-default">
            Uncode
          </Link>
        </p>
      </div>
    </main>
  );
}
