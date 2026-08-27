import type { ProposalRow } from "./types";

export const PROPOSAL_TRACKER_CSV_COLUMNS = [
  "article",
  "currentLanguage",
  "unionProposal",
  "employerCounter",
  "status",
  "notes",
] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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
