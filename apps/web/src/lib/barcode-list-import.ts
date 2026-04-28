export type ParsedBarcodeRow = {
  name: string;
  plaintext: string;
  symbology: string;
};

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, "");
}

function getColumnIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

export function parseBarcodeRows(input: string, defaultSymbology: string): ParsedBarcodeRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  const rows = lines.map((line) => (delimiter === "\t" ? line.split("\t") : splitCsvLine(line)));
  const firstRow = rows[0] ?? [];
  const headers = firstRow.map(normalizeHeader);
  const plaintextIndex = getColumnIndex(firstRow, [
    "plaintext",
    "text",
    "value",
    "barcode",
    "data",
  ]);
  const nameIndex = getColumnIndex(firstRow, ["name", "label", "title"]);
  const typeIndex = getColumnIndex(firstRow, ["type", "symbology", "barcodetype"]);
  const hasHeaders =
    plaintextIndex >= 0 || nameIndex >= 0 || typeIndex >= 0 || headers.includes("value");
  const dataRows = hasHeaders ? rows.slice(1) : rows;

  return dataRows
    .map((row) => {
      const plaintext = hasHeaders
        ? row[plaintextIndex >= 0 ? plaintextIndex : 0]
        : row.length > 1
          ? row[1]
          : row[0];
      const name = hasHeaders ? row[nameIndex] : row.length > 1 ? row[0] : plaintext;
      const symbology = hasHeaders ? row[typeIndex] : row[2];
      return {
        name: (name || plaintext || "").trim(),
        plaintext: (plaintext || "").trim(),
        symbology: (symbology || defaultSymbology).trim() || defaultSymbology,
      };
    })
    .filter((row) => row.name || row.plaintext);
}
