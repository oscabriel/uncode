import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";
import { Badge } from "@cloudflare/kumo";
import { useQuery } from "convex/react";
import { ChevronRight, ListPlus, Plus } from "lucide-react";

export const Route = createFileRoute("/lists/")({
  ssr: false,
  component: ListsIndexComponent,
});

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function ListsIndexComponent() {
  const currentUser = useQuery(api.auth.getCurrentUser);
  const lists = useQuery(api.barcode.lists.listMyLists, { limit: 50 });
  const isAnonymous = !currentUser || currentUser.isAnonymous;
  const isLoading = !isAnonymous && lists === undefined;
  const hasLists = !!lists && lists.length > 0;

  return (
    <main className="min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lists</h1>
            <p className="mt-1 text-sm text-kumo-subtle">
              Saved groups of barcodes for quick scanning, sharing, or printing.
            </p>
          </div>
          {!isAnonymous && (
            <Link
              to="/lists/new"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-kumo-brand px-4 text-sm font-medium text-white transition-colors hover:bg-kumo-brand-hover"
            >
              <Plus className="size-4" />
              New list
            </Link>
          )}
        </div>

        {isAnonymous && (
          <div className="rounded-lg border border-kumo-line bg-kumo-recessed px-5 py-4 text-sm text-kumo-subtle">
            <p>
              <Link
                to="/signin"
                className="font-medium text-kumo-link underline hover:text-kumo-default"
              >
                Sign in
              </Link>{" "}
              to create and save lists.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-lg border border-kumo-line bg-kumo-elevated p-8 text-center text-sm text-kumo-subtle">
            Loading lists…
          </div>
        ) : hasLists ? (
          <ul className="divide-y divide-kumo-line overflow-hidden rounded-lg border border-kumo-line bg-kumo-elevated">
            {lists.map((list) => (
              <li key={list._id}>
                <Link
                  to="/lists/$listId"
                  params={{ listId: list._id }}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-kumo-tint"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-kumo-default">{list.name}</p>
                      {list.isPublicLinkEnabled ? (
                        <Badge variant="success">Shared</Badge>
                      ) : (
                        <Badge variant="secondary">Private</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-kumo-subtle">
                      {list.itemCount} {list.itemCount === 1 ? "barcode" : "barcodes"} · Updated{" "}
                      {dateFormatter.format(new Date(list.updatedAt))}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-kumo-subtle transition-colors group-hover:text-kumo-default" />
                </Link>
              </li>
            ))}
          </ul>
        ) : !isAnonymous ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-kumo-line bg-kumo-elevated px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-kumo-recessed text-kumo-subtle">
              <ListPlus className="size-6" />
            </div>
            <div>
              <p className="font-medium text-kumo-default">No lists yet</p>
              <p className="mt-1 text-sm text-kumo-subtle">
                Group barcodes together for batch scanning, printing, or sharing a stable URL.
              </p>
            </div>
            <Link
              to="/lists/new"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-kumo-brand px-4 text-sm font-medium text-white transition-colors hover:bg-kumo-brand-hover"
            >
              <Plus className="size-4" />
              Create your first list
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
