import { newProposalRowId } from "./draft";
import {
  PROPOSAL_STATUSES,
  type ProposalRow,
  type ProposalStatus,
} from "./types";

export const PROPOSAL_TRACKER_CSV_COLUMNS = [
  "article",
  "currentLanguage",
  "unionProposal",
  "employerCounter",
  "status",
  "notes",
] as const;

/** Soft cap so a huge paste cannot freeze a phone browser. */
export const PROPOSAL_TRACKER_CSV_MAX_ROWS = 500;

export type ProposalTrackerCsvImportResult =
  | { ok: true; rows: ProposalRow[] }
  | { ok: false; code: "empty" | "invalidCsv" | "tooManyRows" };

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvRows(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function headerIndex(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((cell, index) => {
    map[cell.trim().toLowerCase()] = index;
  });
  return map;
}

function cellAt(row: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return row[index] ?? "";
}

function parseStatus(raw: string): ProposalStatus {
  const value = raw.trim();
  if ((PROPOSAL_STATUSES as readonly string[]).includes(value)) {
    return value as ProposalStatus;
  }
  // Spreadsheet edits sometimes change casing.
  const lower = value.toLowerCase();
  const match = PROPOSAL_STATUSES.find((s) => s.toLowerCase() === lower);
  return match ?? "open";
}

function rowHasContent(row: ProposalRow): boolean {
  return Boolean(
    row.article.trim() ||
      row.currentLanguage.trim() ||
      row.unionProposal.trim() ||
      row.employerCounter.trim() ||
      row.notes.trim(),
  );
}

export function serializeProposalTrackerCsv(rows: ProposalRow[]): string {
  const header = PROPOSAL_TRACKER_CSV_COLUMNS.join(",");
  const body = rows.map((row) =>
    [
      row.article,
      row.currentLanguage,
      row.unionProposal,
      row.employerCounter,
      row.status,
      row.notes,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header, ...body].join("\n");
}

/**
 * Parse a Proposal Tracker CSV (same columns as export). Row ids are always
 * regenerated — the file is a backup, not a Hub identity document.
 */
export function parseProposalTrackerCsv(
  text: string,
): ProposalTrackerCsvImportResult {
  const matrix = parseCsvRows(text);
  if (matrix.length < 2) return { ok: false, code: "empty" };

  const header = headerIndex(matrix[0] ?? []);
  // Require the core bargaining columns; status/notes can be missing.
  if (
    header.article === undefined ||
    header.unionproposal === undefined
  ) {
    return { ok: false, code: "invalidCsv" };
  }

  const dataRows = matrix.slice(1);
  if (dataRows.length > PROPOSAL_TRACKER_CSV_MAX_ROWS) {
    return { ok: false, code: "tooManyRows" };
  }

  const rows: ProposalRow[] = [];
  for (const raw of dataRows) {
    const row: ProposalRow = {
      id: newProposalRowId(),
      article: cellAt(raw, header.article),
      currentLanguage: cellAt(raw, header.currentlanguage),
      unionProposal: cellAt(raw, header.unionproposal),
      employerCounter: cellAt(raw, header.employercounter),
      status: parseStatus(cellAt(raw, header.status)),
      notes: cellAt(raw, header.notes),
    };
    if (rowHasContent(row)) rows.push(row);
  }

  if (rows.length === 0) return { ok: false, code: "empty" };
  return { ok: true, rows };
}
