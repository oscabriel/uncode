import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";

import BarcodeHistoryList from "@/components/barcode-history-list";

const HISTORY_LIMIT = 50;
const RECENT_RUNS_QUERY = convexQuery(api.barcodes.listRecentRuns, {
  limit: HISTORY_LIMIT,
});

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [{ title: "Uncode | History" }],
  }),
  component: HistoryComponent,
});

function HistoryComponent() {
  const recentRuns = useQuery(RECENT_RUNS_QUERY);

  return (
    <main className="min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">History</h1>
        <BarcodeHistoryList
          runs={recentRuns.data}
          isLoading={recentRuns.isLoading}
        />
      </div>
    </main>
  );
}
