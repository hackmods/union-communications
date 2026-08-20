/**
 * Completeness rules for Brand Kit starter lists.
 * A catalog that only names the sector and dumps "Additional unit" is incomplete.
 */

import {
  PROFILE_OTHER_ID,
  PROFILE_OTHER_LABEL,
  type CollectionProfileTemplate,
} from "@/lib/brand/collection-profile-catalog";

const STUB_LABELS = new Set([
  "bargaining unit",
  "additional bargaining unit",
  "unit",
  "additional unit",
  "additional workplace",
  "additional hospital",
  "second hospital",
  "local",
]);

const CODE_PATTERN = /^[a-z][a-z0-9-]{0,23}$/;
const ID_PATTERN = /^profile-[a-z0-9-]+$/;

export type StarterListSnapshot = {
  id: string;
  referenceUrl: string;
  /** Optional sourced structure page — required for solidarity-union catalogs */
  structureUrl?: string;
  profiles: CollectionProfileTemplate[];
  defaultActiveId: string;
  /** OPSEU "Other sector" may ship a single Local row */
  allowSingleLocal?: boolean;
  /** One named collection + Other — CAAT Support FT/PT share a local */
  allowSingleNamed?: boolean;
};

function isStubLabel(label: string): boolean {
  const trimmed = label.trim().toLowerCase();
  if (STUB_LABELS.has(trimmed)) return true;
  return /^(additional|extra|second)\b/.test(trimmed);
}

/** Returns human-readable gaps. Empty array means the list is complete. */
export function starterListGaps(list: StarterListSnapshot): string[] {
  const gaps: string[] = [];
  const prefix = list.id;

  if (!list.referenceUrl.startsWith("https://")) {
    gaps.push(`${prefix}: referenceUrl must be https`);
  }

  if (list.structureUrl !== undefined) {
    if (!list.structureUrl.startsWith("https://")) {
      gaps.push(`${prefix}: structureUrl must be https`);
    }
    if (list.structureUrl === list.referenceUrl) {
      gaps.push(`${prefix}: structureUrl must differ from the homepage referenceUrl`);
    }
  }

  const profiles = list.profiles;
  if (list.allowSingleLocal) {
    if (profiles.length !== 1) {
      gaps.push(`${prefix}: single-local lists must have exactly one profile`);
    }
    if (profiles[0] && profiles[0].label !== "Local") {
      gaps.push(`${prefix}: single-local label must be Local`);
    }
    return gaps;
  }

  const minNamedPlusOther = list.allowSingleNamed ? 2 : 3;
  if (profiles.length < minNamedPlusOther) {
    gaps.push(
      `${prefix}: need at least ${
        list.allowSingleNamed
          ? "one named collection plus Other"
          : "two named collections plus Other"
      } (got ${profiles.length})`,
    );
  }

  const last = profiles.at(-1);
  if (!last || last.id !== PROFILE_OTHER_ID || last.label !== PROFILE_OTHER_LABEL) {
    gaps.push(`${prefix}: last profile must be Other`);
  }
  if (last && last.bargainingUnitCode !== "other") {
    gaps.push(`${prefix}: Other must use bargainingUnitCode "other"`);
  }

  if (
    !list.defaultActiveId ||
    list.defaultActiveId === PROFILE_OTHER_ID ||
    !profiles.some((row) => row.id === list.defaultActiveId)
  ) {
    gaps.push(`${prefix}: defaultActiveId must point at a named collection, not Other`);
  }

  const ids = new Set<string>();
  const labels = new Set<string>();
  const codes = new Set<string>();

  for (const row of profiles) {
    const rowId = row.id?.trim() ?? "";
    const label = row.label?.trim() ?? "";
    const code = row.bargainingUnitCode?.trim() ?? "";

    if (!ID_PATTERN.test(rowId)) {
      gaps.push(`${prefix}: invalid id "${rowId}"`);
    }
    if (ids.has(rowId)) gaps.push(`${prefix}: duplicate id ${rowId}`);
    ids.add(rowId);

    if (label.length < 3) {
      gaps.push(`${prefix}: empty or tiny label on ${rowId}`);
    }
    if (rowId !== PROFILE_OTHER_ID && isStubLabel(label)) {
      gaps.push(`${prefix}: stub label "${label}" on ${rowId}`);
    }
    const labelKey = label.toLowerCase();
    if (labels.has(labelKey)) gaps.push(`${prefix}: duplicate label "${label}"`);
    labels.add(labelKey);

    if (!code) {
      gaps.push(`${prefix}: missing bargainingUnitCode on ${rowId}`);
    } else if (!CODE_PATTERN.test(code)) {
      gaps.push(`${prefix}: invalid bargainingUnitCode "${code}" on ${rowId}`);
    }
    if (codes.has(code)) gaps.push(`${prefix}: duplicate code ${code}`);
    codes.add(code);
  }

  return gaps;
}

export function expectCompleteStarterLists(
  lists: StarterListSnapshot[],
): void {
  const gaps = lists.flatMap(starterListGaps);
  if (gaps.length > 0) {
    throw new Error(`Incomplete starter lists:\n- ${gaps.join("\n- ")}`);
  }
}
