import type { MemberSeniorityRecord } from "@/types/bumping";

/**
 * Compare two seniority dates. Earlier date = more senior.
 * Returns -1 if `a` is more senior, 1 if `b` is more senior, 0 if equal.
 * Advisory aid only — not a binding eligibility decision.
 */
export function compareSeniority(
  a: Pick<MemberSeniorityRecord, "seniorityDate">,
  b: Pick<MemberSeniorityRecord, "seniorityDate">,
): -1 | 0 | 1 {
  if (a.seniorityDate < b.seniorityDate) return -1;
  if (a.seniorityDate > b.seniorityDate) return 1;
  return 0;
}

/**
 * Filter active members matching the vacancy classification and sort
 * most senior first. Advisory ranking only — committee judgment prevails.
 */
export function rankEligibleBumpers(
  vacancyClassification: string,
  roster: MemberSeniorityRecord[],
): MemberSeniorityRecord[] {
  return roster
    .filter(
      (record) =>
        record.active && record.classification === vacancyClassification,
    )
    .slice()
    .sort(compareSeniority);
}
