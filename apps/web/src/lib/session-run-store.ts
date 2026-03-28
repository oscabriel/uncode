/**
 * Client-side session storage for anonymous barcode runs.
 *
 * Authenticated users have their runs persisted in the Convex database.
 * Anonymous users see runs only for the current browser session via
 * `sessionStorage`.  Data is lost when the tab is closed.
 */

const STORAGE_KEY = "uncode:anonymous-runs";
const MAX_RUNS = 50;

export type SessionBarcodeRun = {
  /** Client-generated unique id (crypto.randomUUID). */
  id: string;
  kind: "encode" | "decode" | "render";
  status: string;
  plaintext?: string;
  errorMessage?: string;
  createdAt: number;
};

function read(): SessionBarcodeRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionBarcodeRun[];
  } catch {
    return [];
  }
}

function write(runs: SessionBarcodeRun[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // sessionStorage may be full or unavailable — silently ignore.
  }
}

export function getSessionRuns(): SessionBarcodeRun[] {
  return read();
}

export function addSessionRun(run: Omit<SessionBarcodeRun, "id" | "createdAt">): SessionBarcodeRun {
  const entry: SessionBarcodeRun = {
    ...run,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  const runs = [entry, ...read()].slice(0, MAX_RUNS);
  write(runs);
  return entry;
}

export function clearSessionRuns() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
