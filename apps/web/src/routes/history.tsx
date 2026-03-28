import { convexQuery } from "@convex-dev/react-query";
import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";

import BarcodeHistoryList, { type BarcodeRunItem } from "@/components/barcode-history-list";
import { getSessionRuns } from "@/lib/session-run-store";

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
  const currentUser = useQuery(api.auth.getCurrentUser);
  const isAnonymous = !currentUser || currentUser.isAnonymous;

  const recentRuns = useTanstackQuery({
    ...RECENT_RUNS_QUERY,
    enabled: !isAnonymous,
  });

  const runs: BarcodeRunItem[] | undefined = useMemo(() => {
    if (isAnonymous) {
      return getSessionRuns();
    }
    return recentRuns.data?.map((r) => ({
      id: r._id,
      kind: r.kind,
      status: r.status,
      plaintext: r.plaintext,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt,
    }));
  }, [isAnonymous, recentRuns.data]);

  return (
    <main className="min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">History</h1>

        {isAnonymous && (
          <div className="mb-4 rounded-lg border border-kumo-line bg-kumo-recessed px-5 py-4 text-sm text-kumo-subtle">
            <p>
              You're using Uncode anonymously. Runs are stored in this browser session only.{" "}
              <Link
                to="/signin"
                className="font-medium text-kumo-link underline hover:text-kumo-default"
              >
                Sign in
              </Link>{" "}
              to save your history permanently.
            </p>
          </div>
        )}

        <BarcodeHistoryList runs={runs} isLoading={!isAnonymous && recentRuns.isLoading} />
      </div>
    </main>
  );
}
