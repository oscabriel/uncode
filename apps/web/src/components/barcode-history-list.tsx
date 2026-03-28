import { Badge, SkeletonLine } from "@cloudflare/kumo";

/** Minimal shape used by the history list — works for both Convex docs and
 *  client-side session runs. */
export type BarcodeRunItem = {
  id: string;
  kind: string;
  status: string;
  plaintext?: string;
  errorMessage?: string;
  createdAt: number;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function statusLabel(status: string) {
  switch (status) {
    case "success":
      return "Success";
    case "validation_error":
      return "Validation error";
    case "not_found":
      return "Not found";
    case "unsupported_format":
      return "Unsupported format";
    case "invalid_image":
      return "Invalid image";
    default:
      return status;
  }
}

function HistoryItem({ run }: { run: BarcodeRunItem }) {
  const isSuccess = run.status === "success";

  return (
    <div className="space-y-1 px-5 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <Badge variant={isSuccess ? "success" : "destructive"}>{run.kind}</Badge>
          <Badge variant={isSuccess ? "secondary" : "destructive"}>{statusLabel(run.status)}</Badge>
        </div>
        <span className="shrink-0 text-xs text-kumo-subtle">
          {dateFormatter.format(new Date(run.createdAt))}
        </span>
      </div>
      <div className="pl-0.5">
        <p className="truncate text-sm text-kumo-default">{run.plaintext ?? "\u2014"}</p>
        {!isSuccess && run.errorMessage && (
          <p className="mt-0.5 truncate text-xs text-kumo-danger">{run.errorMessage}</p>
        )}
      </div>
    </div>
  );
}

export default function BarcodeHistoryList({
  runs,
  isLoading,
}: {
  runs: BarcodeRunItem[] | undefined;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-lg border border-kumo-line bg-kumo-elevated">
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonLine key={i} className="h-12" />
          ))}
        </div>
      ) : runs && runs.length > 0 ? (
        <div className="divide-y divide-kumo-line">
          {runs.map((run) => (
            <HistoryItem key={run.id} run={run} />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-kumo-subtle">No runs yet.</div>
      )}
    </div>
  );
}
