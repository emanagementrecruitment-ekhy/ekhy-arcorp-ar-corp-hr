import "server-only";

/**
 * Splits one CSV/TSV line into cells, honoring double-quoted fields (with
 * "" as an escaped quote) so a comma or tab inside a quoted value doesn't
 * split it — used for the .csv/.txt bulk-import formats (Excel/.xlsx still
 * goes through the `xlsx` package directly, see readTabularFile below).
 */
function splitDelimited(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/**
 * Plain-text tabular formats (.csv, .txt) — delimiter is auto-detected per
 * file (tab if the header line has at least as many tabs as commas, comma
 * otherwise) since "export as text" from Excel/Sheets commonly produces
 * tab-delimited .txt rather than comma-delimited .csv.
 */
function parseDelimitedText(text: string): Record<string, string>[] {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];
  const tabs = (lines[0].match(/\t/g) ?? []).length;
  const commas = (lines[0].match(/,/g) ?? []).length;
  const delimiter = tabs >= commas ? "\t" : ",";
  const headers = splitDelimited(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const cells = splitDelimited(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
}

/**
 * Reads the first sheet of an .xlsx/.xls file, or the rows of a .csv/.txt
 * file, into one shared shape: an array of row objects keyed by the
 * (trimmed) header text. Every bulk-import route accepts all three formats
 * through this one function instead of re-implementing CSV parsing.
 */
export async function readTabularFile(buf: Buffer, filename: string): Promise<Record<string, string>[]> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return parseDelimitedText(buf.toString("utf-8"));
  }
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Case/spacing-insensitive lookup — the header just has to match one of `aliases`. */
export function pickField(row: Record<string, string>, ...aliases: string[]): string {
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const key of Object.keys(row)) {
    if (normalizedAliases.includes(normalizeHeader(key))) return String(row[key] ?? "").trim();
  }
  return "";
}
