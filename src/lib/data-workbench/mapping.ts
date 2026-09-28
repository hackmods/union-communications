import type { WorkbenchMapping } from "@/lib/db/schema/data-workbench";
import {
  DUES_SOURCE_VALUES,
  DUES_STANDING_VALUES,
  MEMBER_EMPLOYMENT_FIELDS,
  MEMBERSHIP_STATUS_VALUES,
  type CanonicalField,
  type DatasetKind,
} from "./types";

const ALIASES: Record<CanonicalField, string[]> = {
  memberNumber: ["member number", "member id", "membership number", "union id", "id membre", "numéro de membre"],
  fullName: ["full name", "name", "member name", "employee name", "nom complet", "nom"],
  email: ["email", "email address", "e-mail", "courriel"],
  phone: ["phone", "telephone", "mobile", "téléphone"],
  localNumber: ["local", "local number", "local #", "section locale"],
  jobTitle: ["job title", "position", "titre d'emploi", "poste"],
  employer: ["employer", "organization", "employeur"],
  worksite: ["worksite", "site", "location", "work location", "lieu de travail"],
  department: ["department", "unit", "service", "département"],
  supervisorName: ["supervisor", "supervisor name", "manager", "boss", "gestionnaire", "superviseur"],
  effectiveFrom: ["effective from", "start date", "effective date", "date d'entrée en vigueur"],
  effectiveTo: ["effective to", "end date", "termination date", "date de fin"],
  positionId: ["position id", "assignment id", "job record id", "source position id", "id de poste"],
  supervisorNumber: ["supervisor member number", "manager id", "boss member id"],
  membershipStatus: ["membership status", "member status", "statut d'adhésion", "statut membre"],
  duesStanding: ["dues standing", "dues status", "standing", "statut de cotisation", "état des cotisations"],
  duesPeriod: ["dues period", "remittance period", "period", "période de cotisation", "période"],
  duesSource: ["dues source", "standing source", "source de cotisation", "source du statut"],
  classification: ["classification", "class", "band", "pay band", "catégorie", "classification salariale"],
  hireDate: ["hire date", "date hired", "seniority date", "date d'embauche", "date d'ancienneté"],
};

function stripDiacritics(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeEnumToken(value: string) {
  return stripDiacritics(value.trim().toLocaleLowerCase()).replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function aliasMap<T extends string>(entries: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(entries).map(([key, value]) => [normalizeEnumToken(key), value]),
  ) as Record<string, T>;
}

const MEMBERSHIP_STATUS_ALIASES = aliasMap<(typeof MEMBERSHIP_STATUS_VALUES)[number]>({
  active: "active",
  actif: "active",
  activee: "active",
  leave: "leave",
  "on leave": "leave",
  conge: "leave",
  "en congé": "leave",
  resigned: "resigned",
  demission: "resigned",
  "démission": "resigned",
  unknown: "unknown",
  inconnu: "unknown",
});

const DUES_STANDING_ALIASES = aliasMap<(typeof DUES_STANDING_VALUES)[number]>({
  good: "good",
  "good standing": "good",
  "en règle": "good",
  arrears: "arrears",
  "in arrears": "arrears",
  "en retard": "arrears",
  unknown: "unknown",
  inconnu: "unknown",
  exempt: "exempt",
  "exempté": "exempt",
  exempte: "exempt",
});

const DUES_SOURCE_ALIASES = aliasMap<(typeof DUES_SOURCE_VALUES)[number]>({
  employer_report: "employer_report",
  "employer report": "employer_report",
  "rapport employeur": "employer_report",
  card_roster: "card_roster",
  "card roster": "card_roster",
  "signed card": "card_roster",
  "liste de cartes": "card_roster",
  officer_note: "officer_note",
  "officer note": "officer_note",
  "note d'officier": "officer_note",
});

export function normalizeMembershipStatus(value: string): string | null {
  const key = normalizeEnumToken(value);
  return MEMBERSHIP_STATUS_ALIASES[key] ?? null;
}

export function normalizeDuesStanding(value: string): string | null {
  const key = normalizeEnumToken(value);
  return DUES_STANDING_ALIASES[key] ?? null;
}

export function normalizeDuesSource(value: string): string | null {
  const key = normalizeEnumToken(value);
  return DUES_SOURCE_ALIASES[key] ?? null;
}

export function suggestMapping(headers: string[], kind: DatasetKind): WorkbenchMapping {
  const mapping: WorkbenchMapping = {};
  for (const header of headers) {
    const normalized = header.trim().toLocaleLowerCase().replace(/[_-]+/g, " ");
    const match = kind === "member_employment"
      ? MEMBER_EMPLOYMENT_FIELDS.find((field) => ALIASES[field.id].includes(normalized))
      : undefined;
    mapping[header] = match?.id ?? null;
  }
  return mapping;
}

export function applyMapping(
  row: Record<string, string>,
  mapping: WorkbenchMapping,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [header, target] of Object.entries(mapping)) {
    if (!target) continue;
    const value = row[header] ?? "";
    mapped[target] = value.trim();
  }
  return mapped;
}

/** Normalize observational enums after mapping; blank stays blank. */
export function normalizeCanonicalValues(values: Record<string, unknown>): Record<string, unknown> {
  const next = { ...values };
  const membershipStatus = String(next.membershipStatus ?? "").trim();
  if (membershipStatus) {
    const normalized = normalizeMembershipStatus(membershipStatus);
    if (normalized) next.membershipStatus = normalized;
  }
  const duesStanding = String(next.duesStanding ?? "").trim();
  if (duesStanding) {
    const normalized = normalizeDuesStanding(duesStanding);
    if (normalized) next.duesStanding = normalized;
  }
  const duesSource = String(next.duesSource ?? "").trim();
  if (duesSource) {
    const normalized = normalizeDuesSource(duesSource);
    if (normalized) next.duesSource = normalized;
  }
  return next;
}

export function validateMappedRow(values: Record<string, unknown>, kind: DatasetKind): string[] {
  const errors: string[] = [];
  if (kind === "member_employment" && !String(values.fullName ?? "").trim()) errors.push("Full name is required.");
  for (const field of ["effectiveFrom", "effectiveTo", "hireDate"] as const) {
    const value = String(values[field] ?? "").trim();
    if (value && !isIsoDate(value)) {
      const label = field === "hireDate" ? "Hire date" : field === "effectiveFrom" ? "Effective from" : "Effective to";
      errors.push(`${label} must be a valid date in YYYY-MM-DD format.`);
    }
  }
  const from = String(values.effectiveFrom ?? "").trim();
  const to = String(values.effectiveTo ?? "").trim();
  if (from && to && isIsoDate(from) && isIsoDate(to) && to < from) errors.push("Effective to cannot be earlier than effective from.");

  const membershipStatus = String(values.membershipStatus ?? "").trim();
  if (membershipStatus && !normalizeMembershipStatus(membershipStatus) && !MEMBERSHIP_STATUS_VALUES.includes(membershipStatus as (typeof MEMBERSHIP_STATUS_VALUES)[number])) {
    errors.push("Membership status must be active, leave, resigned, or unknown.");
  }
  const duesStanding = String(values.duesStanding ?? "").trim();
  if (duesStanding && !normalizeDuesStanding(duesStanding) && !DUES_STANDING_VALUES.includes(duesStanding as (typeof DUES_STANDING_VALUES)[number])) {
    errors.push("Dues standing must be good, arrears, unknown, or exempt.");
  }
  const duesSource = String(values.duesSource ?? "").trim();
  if (duesSource && !normalizeDuesSource(duesSource) && !DUES_SOURCE_VALUES.includes(duesSource as (typeof DUES_SOURCE_VALUES)[number])) {
    errors.push("Dues source must be employer_report, card_roster, or officer_note.");
  }
  const duesPeriod = String(values.duesPeriod ?? "").trim();
  if (duesPeriod && !/^\d{4}-\d{2}$/.test(duesPeriod) && !isIsoDate(duesPeriod) && duesPeriod.length > 40) {
    errors.push("Dues period should be a short period label (prefer YYYY-MM).");
  }
  return errors;
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
