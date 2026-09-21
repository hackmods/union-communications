import type { WorkbenchMapping } from "@/lib/db/schema/data-workbench";
import { MEMBER_EMPLOYMENT_FIELDS, type CanonicalField, type DatasetKind } from "./types";

const ALIASES: Record<CanonicalField, string[]> = {
  memberNumber: ["member number", "member id", "membership number", "union id", "id membre", "numéro de membre"],
  fullName: ["full name", "name", "member name", "employee name", "nom complet", "nom"],
  email: ["email", "email address", "e-mail", "courriel"],
  phone: ["phone", "telephone", "mobile", "téléphone"],
  localNumber: ["local", "local number", "local #", "section locale"],
  jobTitle: ["job title", "position", "classification", "titre d'emploi", "poste"],
  employer: ["employer", "organization", "employeur"],
  worksite: ["worksite", "site", "location", "work location", "lieu de travail"],
  department: ["department", "unit", "service", "département"],
  supervisorName: ["supervisor", "supervisor name", "manager", "boss", "gestionnaire", "superviseur"],
  effectiveFrom: ["effective from", "start date", "effective date", "date d'entrée en vigueur"],
  effectiveTo: ["effective to", "end date", "termination date", "date de fin"],
  positionId: ["position id", "assignment id", "job record id"],
  supervisorNumber: ["supervisor member number", "manager id", "boss member id"],
};

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

export function validateMappedRow(values: Record<string, unknown>, kind: DatasetKind): string[] {
  const errors: string[] = [];
  if (kind === "member_employment" && !String(values.fullName ?? "").trim()) errors.push("Full name is required.");
  for (const field of ["effectiveFrom", "effectiveTo"]) {
    const value = String(values[field] ?? "").trim();
    if (value && !isIsoDate(value)) errors.push(`${field === "effectiveFrom" ? "Effective from" : "Effective to"} must be a valid date in YYYY-MM-DD format.`);
  }
  const from = String(values.effectiveFrom ?? "").trim();
  const to = String(values.effectiveTo ?? "").trim();
  if (from && to && isIsoDate(from) && isIsoDate(to) && to < from) errors.push("Effective to cannot be earlier than effective from.");
  return errors;
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
