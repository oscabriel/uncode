import type { Doc } from "@uncode/backend/convex/_generated/dataModel";
import { History, ScanLine, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@uncode/ui/components/card";
import { Skeleton } from "@uncode/ui/components/skeleton";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function HistoryItem({ run }: { run: Doc<"barcodeRuns"> }) {
  const isSuccess = run.status === "success";

  return (
    <div className="grid gap-3 border border-white/10 bg-black/20 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
      <div
        className={`inline-flex w-fit items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-[0.22em] ${
          isSuccess
            ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
            : "border border-red-400/30 bg-red-400/10 text-red-200"
        }`}
      >
        {run.kind === "render" ? <Sparkles className="size-3" /> : <ScanLine className="size-3" />}
        {run.kind}
      </div>

      <div className="min-w-0">
        <p
          className="truncate text-sm text-white"
          style={{ fontFamily: '"Chakra Petch", sans-serif' }}
        >
          {run.plaintext ?? "Untitled run"}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {run.encodedText ? `Libre text: ${run.encodedText}` : (run.errorMessage ?? run.status)}
        </p>
      </div>

      <div className="text-xs text-zinc-500">{dateFormatter.format(new Date(run.createdAt))}</div>
    </div>
  );
}

export default function BarcodeHistoryList({
  runs,
  isLoading,
}: {
  runs: Doc<"barcodeRuns">[] | undefined;
  isLoading: boolean;
}) {
  return (
    <Card className="border border-white/10 bg-zinc-950/70 backdrop-blur-sm">
      <CardHeader className="gap-3 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-amber-200/80">
          <History className="size-4" />
          Recent activity
        </div>
        <CardTitle className="text-white" style={{ fontFamily: '"Chakra Petch", sans-serif' }}>
          Convex-backed run history
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Successful and failed encode/render requests are stored so the workbench stays auditable
          while the POC grows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-5 [content-visibility:auto]">
        {isLoading ? (
          Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 border border-white/10 bg-white/5" />
          ))
        ) : runs && runs.length > 0 ? (
          runs.map((run) => <HistoryItem key={run._id} run={run} />)
        ) : (
          <div className="border border-dashed border-white/10 bg-black/20 p-6 text-sm text-zinc-500">
            No runs yet. Your next encode or render request will appear here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
