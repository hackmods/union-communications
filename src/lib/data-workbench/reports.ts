import { normalizeAsOf } from "./as-of";
import type { DataAccessResult } from "./access";
import { listGenericRecords, listPeople } from "./service";

export type CuratedReportView =
  | "people_as_of"
  | "assignments_as_of"
  | "dues_standing_snapshot";

export const CURATED_REPORT_VIEWS: CuratedReportView[] = [
  "people_as_of",
  "assignments_as_of",
  "dues_standing_snapshot",
];

type Scope = Extract<DataAccessResult, { ok: true }>;

export type ReportRunResult = {
  view: CuratedReportView;
  asOf: string;
  columns: string[];
  rows: Array<Record<string, string>>;
  total: number;
};

function formulaSafe(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`;
  return value;
}

function cell(value: unknown): string {
  if (value == null) return "";
  return formulaSafe(String(value));
}

export async function runCuratedReport(
  scope: Scope,
  input: { view: CuratedReportView; asOf?: string; datasetId?: string },
): Promise<ReportRunResult> {
  const asOf = normalizeAsOf(input.asOf);

  if (input.view === "people_as_of" || input.view === "dues_standing_snapshot") {
    const listed = await listPeople(scope, { asOf, limit: 200, offset: 0 });
    // Pull additional pages for report completeness (cap 2,000).
    const people = [...listed.people];
    let next = listed.nextOffset;
    while (next != null && people.length < 2000) {
      const page = await listPeople(scope, { asOf, limit: 200, offset: next });
      people.push(...page.people);
      next = page.nextOffset;
    }
    const columns = input.view === "dues_standing_snapshot"
      ? ["memberNumber", "displayName", "duesStanding", "duesPeriod", "duesSource", "membershipStatus", "asOf"]
      : ["memberNumber", "displayName", "duesStanding", "membershipStatus", "openJobCount", "jobTitles", "employers", "asOf"];
    const rows = people.map((person): Record<string, string> => {
      if (input.view === "dues_standing_snapshot") {
        return {
          memberNumber: cell(person.memberNumber),
          displayName: cell(person.displayName),
          duesStanding: cell(person.duesStanding),
          duesPeriod: cell(person.profile.duesPeriod),
          duesSource: cell(person.profile.duesSource),
          membershipStatus: cell(person.membershipStatus),
          asOf: cell(asOf),
        };
      }
      return {
        memberNumber: cell(person.memberNumber),
        displayName: cell(person.displayName),
        duesStanding: cell(person.duesStanding),
        membershipStatus: cell(person.membershipStatus),
        openJobCount: cell(person.openJobCount),
        jobTitles: cell(person.assignments.map((job) => job.jobTitle).filter(Boolean).join("; ")),
        employers: cell(person.assignments.map((job) => job.employer).filter(Boolean).join("; ")),
        asOf: cell(asOf),
      };
    });
    return { view: input.view, asOf, columns, rows, total: rows.length };
  }

  if (input.view === "assignments_as_of") {
    const listed = await listPeople(scope, { asOf, limit: 200, offset: 0 });
    const people = [...listed.people];
    let next = listed.nextOffset;
    while (next != null && people.length < 2000) {
      const page = await listPeople(scope, { asOf, limit: 200, offset: next });
      people.push(...page.people);
      next = page.nextOffset;
    }
    const columns = [
      "memberNumber", "displayName", "positionKey", "jobTitle", "employer", "worksite", "department",
      "supervisorName", "effectiveFrom", "effectiveTo", "asOf",
    ];
    const rows = people.flatMap((person) => person.assignments.map((job) => ({
      memberNumber: cell(person.memberNumber),
      displayName: cell(person.displayName),
      positionKey: cell(job.positionKey),
      jobTitle: cell(job.jobTitle),
      employer: cell(job.employer),
      worksite: cell(job.worksite),
      department: cell(job.department),
      supervisorName: cell(job.supervisorName),
      effectiveFrom: cell(job.effectiveFrom),
      effectiveTo: cell(job.effectiveTo || ""),
      asOf: cell(asOf),
    })));
    return { view: input.view, asOf, columns, rows, total: rows.length };
  }

  throw new Error("Unknown report view.");
}

export async function runDatasetRevisionReport(scope: Scope, datasetId: string) {
  const result = await listGenericRecords(scope, datasetId, { limit: 500, offset: 0 });
  if (!result) throw new Error("Dataset not found or is not a general table.");
  const columns = result.dataset.fields.map((field) => field.id);
  const rows = result.records.map((record) => {
    const row: Record<string, string> = {};
    for (const column of columns) row[column] = cell(record.values[column]);
    return row;
  });
  return {
    view: "dataset_revision" as const,
    asOf: normalizeAsOf(null),
    columns,
    rows,
    total: result.total,
    datasetName: result.dataset.name,
  };
}

export function toCsv(columns: string[], rows: Array<Record<string, string>>): string {
  const escape = (value: string) => {
    const safe = formulaSafe(value);
    if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
    return safe;
  };
  return [columns.map(escape).join(","), ...rows.map((row) => columns.map((column) => escape(row[column] ?? "")).join(","))].join("\r\n");
}
