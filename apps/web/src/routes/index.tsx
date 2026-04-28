import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Image } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Uncode" }],
  }),
  component: HomeComponent,
});

const SUPPORTED_SYMBOLOGIES = ["Code 128", "QR", "EAN-13", "EAN-8", "UPC-A"] as const;

function HomeComponent() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const lineCount = text.split("\n").length;
  const textareaRows = Math.max(1, Math.min(lineCount, 8));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    navigate({ to: "/workbench", search: { text: trimmed, tab: "encode" } });
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 pb-20">
      <div className="w-full max-w-xl space-y-10 text-center">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight text-kumo-default">Uncode</h1>
          <p className="text-lg text-kumo-subtle italic">Encode. Decode. Uncode. Barcodes.</p>
        </div>

        <div className="space-y-3">
          <form onSubmit={handleSubmit} className="flex gap-3 items-start">
            <div className="relative flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type to encode, or upload an image to decode…"
                autoComplete="off"
                spellCheck={false}
                rows={textareaRows}
                className="min-h-12 w-full resize-y rounded-xl border border-kumo-line bg-kumo-elevated pl-5 pr-12 py-3 text-[15px] text-kumo-default placeholder:text-kumo-subtle transition-colors focus:border-kumo-default/30 focus:outline-none"
              />
              <label
                htmlFor="home-image-upload"
                title="Upload an image to decode"
                className="absolute right-3 top-3 cursor-pointer rounded-md p-1 text-kumo-subtle transition-colors hover:text-kumo-default"
              >
                <Image className="size-5" />
                <input
                  id="home-image-upload"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={() =>
                    navigate({
                      to: "/workbench",
                      search: { text: undefined, tab: "decode" },
                    })
                  }
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-kumo-brand text-white transition-colors hover:bg-kumo-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRight className="size-5" />
            </button>
          </form>

          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-kumo-subtle">
            {SUPPORTED_SYMBOLOGIES.map((label, i) => (
              <span key={label} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="text-kumo-line">·</span>}
                <span>{label}</span>
              </span>
            ))}
          </p>
        </div>
      </div>
    </main>
  );
}
