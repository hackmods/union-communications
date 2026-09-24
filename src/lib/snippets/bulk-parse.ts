import type { CreateCaSnippetInput } from "@/types/qol";
import { normalizeSnippetText } from "./text-normalize";

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseTags(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[|;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Parse CSV with headers `clauseRef,title,body,tags`
 * (aliases: clause_ref, clause-ref). Tags are pipe or semicolon separated.
 */
export function parseSnippetCsv(content: string): CreateCaSnippetInput[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const clauseIdx = headers.findIndex((h) =>
    ["clauseref", "clause_ref", "clause"].includes(h),
  );
  const titleIdx = headers.findIndex((h) => h === "title");
  const bodyIdx = headers.findIndex((h) => h === "body");
  const tagsIdx = headers.findIndex((h) => h === "tags");

  if (clauseIdx < 0 || titleIdx < 0 || bodyIdx < 0) {
    return [];
  }

  const results: CreateCaSnippetInput[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const clauseRef = cells[clauseIdx] ?? "";
    const title = cells[titleIdx] ?? "";
    const body = cells[bodyIdx] ?? "";
    const normalizedClause = normalizeSnippetText(clauseRef);
    const normalizedTitle = normalizeSnippetText(title);
    const normalizedBody = normalizeSnippetText(body);
    if (!normalizedClause || !normalizedTitle || !normalizedBody) continue;
    results.push({
      clauseRef: normalizedClause,
      title: normalizedTitle,
      body: normalizedBody,
      tags:
        tagsIdx >= 0
          ? parseTags(cells[tagsIdx]).map((t) => normalizeSnippetText(t)).filter(Boolean)
          : [],
    });
  }
  return results;
}

/**
 * Plain-text block format:
 *   Article X.Y | Title
 *   body line(s)…
 *   <blank line>
 */
export function parseSnippetText(content: string): CreateCaSnippetInput[] {
  const blocks = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/);
  const results: CreateCaSnippetInput[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l, i, arr) => {
        if (l.trim().length > 0) return true;
        // keep internal blank lines out; leading/trailing already gone via split
        return i > 0 && i < arr.length - 1;
      });
    const nonEmpty = lines.filter((l) => l.trim().length > 0);
    if (nonEmpty.length < 2) continue;

    const header = nonEmpty[0];
    const pipeIdx = header.indexOf("|");
    if (pipeIdx < 0) continue;
    const clauseRef = normalizeSnippetText(header.slice(0, pipeIdx));
    const title = normalizeSnippetText(header.slice(pipeIdx + 1));
    const body = normalizeSnippetText(nonEmpty.slice(1).join("\n"));
    if (!clauseRef || !title || !body) continue;
    results.push({ clauseRef, title, body, tags: [] });
  }
  return results;
}

export function parseSnippetBulk(
  format: "csv" | "text",
  content: string,
): CreateCaSnippetInput[] {
  return format === "csv" ? parseSnippetCsv(content) : parseSnippetText(content);
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    const text = (value as { text?: unknown }).text;
    return typeof text === "string" ? text : String(text ?? "");
  }
  return String(value);
}

/**
 * Parse first worksheet of an .xlsx workbook with headers
 * clauseRef / title / body / tags (same aliases as CSV).
 */
export async function parseSnippetXlsx(
  bytes: ArrayBuffer | Uint8Array,
): Promise<CreateCaSnippetInput[]> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const buffer =
    bytes instanceof Uint8Array
      ? Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : Buffer.from(bytes);
  // exceljs typings accept Buffer; cast keeps node Buffer happy under Next.
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values;
    // ExcelJS rows are 1-indexed; index 0 is unused.
    const cells = Array.isArray(values)
      ? values.slice(1).map((v) => cellToString(v).trim())
      : [];
    if (cells.some((c) => c.length > 0)) rows.push(cells);
  });
  if (rows.length < 2) return [];

  // Reuse CSV parser via a synthetic CSV string (handles quoting).
  const escape = (c: string) =>
    /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c;
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  return parseSnippetCsv(csv);
}
