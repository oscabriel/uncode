import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@cloudflare/kumo";
import { Image } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Uncode" }],
  }),
  component: HomeComponent,
});

function HomeComponent() {
  const navigate = useNavigate();
  const [text, setText] = useState("");

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
          <h1 className="text-5xl font-bold tracking-tight text-kumo-default">
            Uncode
          </h1>
          <p className="text-lg text-kumo-subtle">
            Barcode. Encode. Decode. Uncode.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to encode or upload image to decode..."
              autoComplete="off"
              spellCheck={false}
              className="h-12 w-full rounded-xl border border-kumo-line bg-kumo-elevated pl-5 pr-12 text-[15px] text-kumo-default placeholder:text-kumo-subtle transition-colors focus:border-kumo-default/30 focus:outline-none"
            />
            <label
              htmlFor="home-image-upload"
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-kumo-subtle transition-colors hover:text-kumo-default"
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
          <Button
            type="submit"
            variant="primary"
            disabled={!text.trim()}
            className="h-12 rounded-xl px-8"
          >
            Generate
          </Button>
        </form>
      </div>
    </main>
  );
}
