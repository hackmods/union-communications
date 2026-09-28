import type { WorkbenchField, WorkbenchMapping } from "@/lib/db/schema/data-workbench";
import { applyMapping, normalizeCanonicalValues } from "./mapping";
import type { DataDataset } from "./types";

export type PublishImpactSummary = {
  acceptedRows: number;
  excludedRows: number;
  pendingRows: number;
  newPeople: number;
  matchedPeople: number;
  jobsWithPositionId: number;
  jobsMissingPositionId: number;
  duesStandingRows: number;
};

function normalizeMappedValues(values: Record<string, unknown>, fields: WorkbenchField[]) {
  const normalized = { ...values };
  for (const field of fields) {
    if (!(field.id in normalized)) continue;
    const value = String(normalized[field.id] ?? "").trim();
    if (!value) {
      normalized[field.id] = null;
      continue;
    }
    if (field.type === "number") {
      const number = Number(value);
      normalized[field.id] = Number.isFinite(number) ? number : value;
    } else if (field.type === "boolean") {
      normalized[field.id] = /^(true|yes|1)$/i.test(value)
        ? true
        : /^(false|no|0)$/i.test(value)
          ? false
          : value;
    } else {
      normalized[field.id] = value;
    }
  }
  return normalized;
}

/** Pure preview of what accepted rows would contribute on publish. */
export function summarizePublishImpact(
  dataset: Pick<DataDataset, "kind" | "fields">,
  mapping: WorkbenchMapping,
  staged: Array<{ decision: string; rawValues: Record<string, string>; matchPersonId: string | null }>,
): PublishImpactSummary {
  let acceptedRows = 0;
  let excludedRows = 0;
  let pendingRows = 0;
  let newPeople = 0;
  let matchedPeople = 0;
  let jobsWithPositionId = 0;
  let jobsMissingPositionId = 0;
  let duesStandingRows = 0;
  for (const row of staged) {
    if (row.decision === "accept") acceptedRows += 1;
    else if (row.decision === "exclude") excludedRows += 1;
    else if (row.decision === "pending") pendingRows += 1;
    if (row.decision !== "accept" || dataset.kind !== "member_employment") continue;
    const values = normalizeCanonicalValues(
      normalizeMappedValues(applyMapping(row.rawValues, mapping), dataset.fields),
    );
    if (row.matchPersonId) matchedPeople += 1;
    else if (String(values.memberNumber ?? "").trim()) newPeople += 1;
    const jobFields = ["employer", "jobTitle", "worksite", "department", "supervisorName"];
    const hasJob = jobFields.some((key) => String(values[key] ?? "").trim());
    if (hasJob && String(values.positionId ?? "").trim()) jobsWithPositionId += 1;
    else if (hasJob) jobsMissingPositionId += 1;
    if (String(values.duesStanding ?? "").trim()) duesStandingRows += 1;
  }
  return {
    acceptedRows,
    excludedRows,
    pendingRows,
    newPeople,
    matchedPeople,
    jobsWithPositionId,
    jobsMissingPositionId,
    duesStandingRows,
  };
}
