import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";
import { useKumoToastManager } from "@cloudflare/kumo";
import { useAction, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, Loader2, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { parseBarcodeRows } from "@/lib/barcode-list-import";

export const Route = createFileRoute("/lists/new")({
  ssr: false,
  head: () => ({ meta: [{ title: "Uncode | New list" }] }),
  component: NewListComponent,
});

function NewListComponent() {
  const navigate = useNavigate();
  const toasts = useKumoToastManager();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const barcodeTypes = useQuery(api.barcodeTypes.list);
  const createList = useAction(api.barcode.listActions.createListFromRows);
  const [listName, setListName] = useState("");
  const [defaultType, setDefaultType] = useState("code128");
  const [rawInput, setRawInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failures, setFailures] = useState<
    { row: number; plaintext: string; errorMessage: string }[]
  >([]);

  const rows = useMemo(() => parseBarcodeRows(rawInput, defaultType), [rawInput, defaultType]);
  const isAnonymous = !currentUser || currentUser.isAnonymous;
  const canSubmit = !isAnonymous && !isSubmitting && rows.length > 0 && listName.trim().length > 0;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setRawInput(await file.text());
    setFailures([]);
  }

  async function handleSubmit() {
    setFailures([]);
    if (isAnonymous) {
      toasts.add({ title: "Sign in to create saved lists.", variant: "error" });
      return;
    }
    if (!listName.trim()) {
      toasts.add({ title: "Name the list first.", variant: "error" });
      return;
    }
    if (rows.length === 0) {
      toasts.add({ title: "Add at least one barcode row.", variant: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createList({
        name: listName,
        items: rows.map((row) => ({
          name: row.name,
          plaintext: row.plaintext,
          symbology: row.symbology,
        })),
      });
      if (!result.ok) {
        setFailures(result.failures);
        toasts.add({
          title: "Fix validation errors before creating the list.",
          variant: "error",
        });
        return;
      }
      toasts.add({ title: "List created.", variant: "success" });
      await navigate({ to: "/lists/$listId", params: { listId: result.listId } });
    } catch (error) {
      toasts.add({
        title: error instanceof Error ? error.message : "List creation failed.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
        <div className="space-y-1">
          <Link
            to="/lists"
            className="inline-flex items-center gap-1 text-xs font-medium text-kumo-subtle transition-colors hover:text-kumo-default"
          >
            <ArrowLeft className="size-3" />
            Lists
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">New list</h1>
          <p className="text-sm text-kumo-subtle">
            Save a named set of barcodes you can scan, share, or print as a single page.
          </p>
        </div>

        {isAnonymous && (
          <div className="rounded-lg border border-kumo-line bg-kumo-recessed px-5 py-4 text-sm text-kumo-subtle">
            <Link
              to="/signin"
              className="font-medium text-kumo-link underline hover:text-kumo-default"
            >
              Sign in
            </Link>{" "}
            to create and save lists.
          </div>
        )}

        <section className="grid gap-3 rounded-xl border border-kumo-line bg-kumo-elevated p-4 sm:grid-cols-[1fr_14rem]">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-kumo-subtle">
            <span>List name</span>
            <input
              value={listName}
              onChange={(event) => setListName(event.target.value)}
              placeholder="Store shelf labels"
              className="h-10 w-full rounded-md border border-kumo-line bg-kumo-recessed px-3 text-sm text-kumo-default outline-none transition-colors focus:border-kumo-default/30"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-kumo-subtle">
            <span>Default type</span>
            <select
              value={defaultType}
              onChange={(event) => setDefaultType(event.target.value)}
              className="h-10 w-full rounded-md border border-kumo-line bg-kumo-recessed px-3 text-sm text-kumo-default outline-none transition-colors focus:border-kumo-default/30"
            >
              {(barcodeTypes ?? []).map((type) => (
                <option key={type.symbology} value={type.symbology}>
                  {type.displayName}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-3 rounded-xl border border-kumo-line bg-kumo-elevated p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-kumo-default">Rows</h2>
              <p className="mt-0.5 text-xs text-kumo-subtle">
                Paste tab- or comma-separated rows. Headers{" "}
                <span className="font-mono text-[11px]">name, plaintext, type</span> are detected
                automatically.
              </p>
            </div>
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-kumo-line bg-kumo-recessed px-3 py-1.5 text-xs font-medium text-kumo-default transition-colors hover:bg-kumo-tint">
              <Upload className="size-3.5" />
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>
          </div>
          <textarea
            value={rawInput}
            onChange={(event) => {
              setRawInput(event.target.value);
              setFailures([]);
            }}
            placeholder={
              "name,plaintext,type\nFront Door,ABC-123,code128\nInventory QR,https://example.com/item/42,qr"
            }
            className="min-h-48 w-full resize-y rounded-md border border-kumo-line bg-kumo-recessed px-3 py-2 font-mono text-sm text-kumo-default outline-none transition-colors focus:border-kumo-default/30"
          />
        </section>

        {failures.length > 0 && (
          <section className="rounded-xl border border-kumo-danger/30 bg-kumo-danger/10 p-4 text-sm text-kumo-danger">
            <h2 className="font-semibold">Validation errors</h2>
            <ul className="mt-2 space-y-1">
              {failures.map((failure) => (
                <li key={`${failure.row}-${failure.plaintext}`}>
                  Row {failure.row}: {failure.errorMessage}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3 rounded-xl border border-kumo-line bg-kumo-elevated p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-kumo-default">Preview</h2>
            <span className="text-xs text-kumo-subtle">
              {rows.length} {rows.length === 1 ? "row" : "rows"}
            </span>
          </div>
          <div className="max-h-72 overflow-auto rounded-md border border-kumo-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-kumo-recessed text-[11px] uppercase tracking-wide text-kumo-subtle">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Plaintext</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kumo-line">
                {rows.length > 0 ? (
                  rows.map((row, index) => (
                    <tr key={`${row.plaintext}-${index}`}>
                      <td className="px-3 py-2 text-kumo-default">{row.name}</td>
                      <td className="px-3 py-2 font-mono text-kumo-default">{row.plaintext}</td>
                      <td className="px-3 py-2 text-kumo-subtle">{row.symbology}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-kumo-subtle">
                      Paste rows or upload a CSV to preview.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-kumo-brand px-4 text-sm font-medium text-white transition-colors hover:bg-kumo-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                Create list
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
