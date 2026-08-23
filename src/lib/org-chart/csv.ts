import {
  MAX_ROSTER_PEOPLE,
  PUBLIC_ROSTER_GROUPS,
  PUBLIC_ROSTER_UNITS,
  type PublicRoster,
  type PublicRosterGroup,
  type PublicRosterPerson,
  type PublicRosterUnit,
} from "@/types/public-roster";
import { newRosterPersonId } from "./defaults";
import {
  stampRoster,
  type RosterImportResult,
} from "./schema";

export const PUBLIC_ROSTER_CSV_COLUMNS = [
  "name",
  "role",
  "location",
  "group",
  "committee",
  "showOnWebsite",
  "reportsTo",
  "unit",
] as const;

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

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseBool(raw: string, fallback: boolean): boolean {
  const value = raw.trim().toLowerCase();
  if (!value) return fallback;
  if (["true", "yes", "y", "1"].includes(value)) return true;
  if (["false", "no", "n", "0"].includes(value)) return false;
  return fallback;
}

function parseGroup(raw: string): PublicRosterGroup | null {
  const value = raw.trim().toLowerCase();
  if ((PUBLIC_ROSTER_GROUPS as readonly string[]).includes(value)) {
    return value as PublicRosterGroup;
  }
  if (value === "exec" || value === "officer" || value === "officers") {
    return "executive";
  }
  if (value === "steward" || value === "stewards") return "stewards";
  if (value === "committees") return "committee";
  return null;
}

function reportsToLabel(person: PublicRosterPerson): string {
  const reports = person.reportsToId?.trim();
  return reports ?? "";
}

export function serializePublicRosterCsv(roster: PublicRoster): string {
  const byId = new Map(roster.people.map((person) => [person.id, person]));
  const lines = [PUBLIC_ROSTER_CSV_COLUMNS.join(",")];
  for (const person of roster.people) {
    const boss = person.reportsToId ? byId.get(person.reportsToId) : undefined;
    const reportsTo = boss?.name.trim() || boss?.role.trim() || reportsToLabel(person);
    lines.push(
      [
        csvEscape(person.name),
        csvEscape(person.role),
        csvEscape(person.location),
        person.group,
        csvEscape(person.committeeName ?? ""),
        person.showOnWebsite ? "true" : "false",
        csvEscape(reportsTo),
        person.unit ?? "",
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

function parseUnit(raw: string): PublicRosterUnit | null {
  const value = raw.trim().toLowerCase();
  if ((PUBLIC_ROSTER_UNITS as readonly string[]).includes(value)) {
    return value as PublicRosterUnit;
  }
  if (value === "full-time" || value === "fulltime" || value === "f/t") {
    return "ft";
  }
  if (value === "part-time" || value === "parttime" || value === "p/t") {
    return "pt";
  }
  return null;
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
  return (row[index] ?? "").trim();
}

export function parsePublicRosterCsv(text: string): RosterImportResult {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { ok: false, code: "empty" };

  const header = headerIndex(rows[0] ?? []);
  if (header.name === undefined || header.role === undefined) {
    return { ok: false, code: "invalidCsv" };
  }

  const draft: Array<PublicRosterPerson & { reportsToLabel: string }> = [];
  for (const row of rows.slice(1)) {
    if (draft.length >= MAX_ROSTER_PEOPLE) break;
    const name = cellAt(row, header.name);
    const role = cellAt(row, header.role);
    if (!name && !role) continue;
    const group =
      parseGroup(cellAt(row, header.group)) ??
      (cellAt(row, header.committee) ? "committee" : "executive");
    const showDefault = group === "executive";
    const unit = parseUnit(cellAt(row, header.unit));
    draft.push({
      id: newRosterPersonId(),
      name,
      role,
      location: cellAt(row, header.location),
      group,
      committeeName: cellAt(row, header.committee) || undefined,
      showOnWebsite: parseBool(cellAt(row, header.showonwebsite), showDefault),
      ...(unit ? { unit } : {}),
      reportsToLabel: cellAt(row, header.reportsto),
    });
  }

  if (!draft.length) return { ok: false, code: "empty" };

  const people: PublicRosterPerson[] = draft.map((row) => {
    const { reportsToLabel: label, ...person } = row;
    if (!label) return { ...person, reportsToId: null };
    const match = draft.find(
      (candidate) =>
        candidate.id !== person.id &&
        (candidate.name.trim().toLowerCase() === label.toLowerCase() ||
          candidate.role.trim().toLowerCase() === label.toLowerCase()),
    );
    return match?.id
      ? { ...person, reportsToId: match.id }
      : person;
  });

  return { ok: true, roster: stampRoster(people) };
}
