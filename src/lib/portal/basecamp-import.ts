export type BasecampImportKind = "bulletin" | "action" | "binder";

export interface BasecampImportRow {
  kind: BasecampImportKind;
  title: string;
  body: string;
}

function normalizeKind(raw: string): BasecampImportKind | null {
  const k = raw.trim().toLowerCase();
  if (
    ["bulletin", "message", "campfire", "post", "babillard"].includes(k)
  ) {
    return "bulletin";
  }
  if (["action", "todo", "to-do", "task", "assignment"].includes(k)) {
    return "action";
  }
  if (["binder", "document", "file", "doc", "classeur"].includes(k)) {
    return "binder";
  }
  return null;
}

/** Split a CSV line respecting double-quoted fields. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/**
 * Parse a simple Basecamp-style CSV into Circles tools.
 * Header row required: type,title,body (aliases accepted).
 */
export function parseBasecampCsv(csv: string): BasecampImportRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const typeIdx = header.findIndex((h) =>
    ["type", "kind", "tool", "category"].includes(h),
  );
  const titleIdx = header.findIndex((h) =>
    ["title", "name", "subject"].includes(h),
  );
  const bodyIdx = header.findIndex((h) =>
    ["body", "content", "description", "notes", "text"].includes(h),
  );
  if (typeIdx < 0 || titleIdx < 0) return [];

  const rows: BasecampImportRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const kind = normalizeKind(cells[typeIdx] ?? "");
    const title = (cells[titleIdx] ?? "").trim();
    if (!kind || !title) continue;
    rows.push({
      kind,
      title,
      body: (bodyIdx >= 0 ? cells[bodyIdx] ?? "" : "").trim(),
    });
  }
  return rows;
}
