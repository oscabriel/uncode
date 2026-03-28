import { WandSparkles } from "lucide-react";
import { Button } from "@uncode/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@uncode/ui/components/card";
import { Input } from "@uncode/ui/components/input";
import { Label } from "@uncode/ui/components/label";

const EXAMPLES = ["WO20070317", "ABC12345ZX", "81936910422665342067"] as const;

type PendingAction = "encode" | "preview" | null;

export default function BarcodeEncodeForm({
  plaintext,
  onPlaintextChange,
  onEncode,
  onGeneratePreview,
  pendingAction,
}: {
  plaintext: string;
  onPlaintextChange: (value: string) => void;
  onEncode: () => void;
  onGeneratePreview: () => void;
  pendingAction: PendingAction;
}) {
  const isBusy = pendingAction !== null;
  const hasPlaintext = plaintext.trim().length > 0;

  return (
    <Card className="border border-white/10 bg-zinc-950/70 backdrop-blur-sm">
      <CardHeader className="gap-3 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">
          <WandSparkles className="size-4" />
          Encode + Render
        </div>
        <CardTitle
          className="text-2xl text-white"
          style={{ fontFamily: '"Chakra Petch", sans-serif' }}
        >
          Turn plain text into a scan-ready Code 128 barcode.
        </CardTitle>
        <CardDescription className="max-w-xl text-sm text-zinc-400">
          The backend computes canonical Code 128 values first, then derives the Libre Barcode 128
          text string and our own renderer output from that source of truth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="space-y-2">
          <Label htmlFor="barcode-plaintext" className="text-zinc-300">
            Plaintext
          </Label>
          <Input
            id="barcode-plaintext"
            value={plaintext}
            onChange={(event) => onPlaintextChange(event.target.value)}
            placeholder="WO20070317"
            className="h-12 border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-zinc-500"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-zinc-500">
            POC-safe input is printable ASCII. Numeric runs switch into Code Set C automatically
            when it reduces symbol count.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onPlaintextChange(example)}
              className="border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium tracking-[0.18em] text-zinc-300 uppercase transition hover:border-cyan-300/50 hover:text-white"
              style={{ fontFamily: '"IBM Plex Mono", monospace' }}
            >
              {example}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={onGeneratePreview}
            disabled={!hasPlaintext || isBusy}
            className="h-11 flex-1 bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
          >
            {pendingAction === "preview" ? "Generating preview..." : "Generate barcode preview"}
          </Button>
          <Button
            type="button"
            onClick={onEncode}
            disabled={!hasPlaintext || isBusy}
            variant="outline"
            className="h-11 flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            {pendingAction === "encode" ? "Encoding..." : "Encode text only"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
