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
