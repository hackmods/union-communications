import type { MemberSeniorityRecord } from "@/types/bumping";

/**
 * In-memory seed seniority roster for the advisory bumping aid.
 * Replaced by durable storage when Postgres roster APIs land.
 */
export const SEED_SENIORITY_ROSTER: MemberSeniorityRecord[] = [
  {
    id: "snr-001",
    unionId: "union-opseu",
    localId: "local-243",
    memberRef: "Member A",
    seniorityDate: "2015-03-01",
    classification: "Administrative Assistant I",
    active: true,
  },
  {
    id: "snr-002",
    unionId: "union-opseu",
    localId: "local-243",
    memberRef: "Member B",
    seniorityDate: "2017-06-15",
    classification: "Administrative Assistant I",
    active: true,
  },
  {
    id: "snr-003",
    unionId: "union-opseu",
    localId: "local-243",
    memberRef: "Member C",
    seniorityDate: "2018-09-01",
    classification: "Administrative Assistant II",
    active: true,
  },
  {
    id: "snr-004",
    unionId: "union-opseu",
    localId: "local-243",
    memberRef: "Member D",
    seniorityDate: "2012-01-10",
    classification: "Administrative Assistant I",
    active: false,
  },
  {
    id: "snr-005",
    unionId: "union-opseu",
    localId: "local-243",
    memberRef: "Member E",
    seniorityDate: "2016-11-20",
    classification: "Administrative Assistant I",
    active: true,
  },
  {
    id: "snr-006",
    unionId: "union-opseu",
    localId: "local-999",
    memberRef: "Member Other Local",
    seniorityDate: "2010-01-01",
    classification: "Administrative Assistant I",
    active: true,
  },
];

export function listSeniorityRoster(filters: {
  unionId: string;
  localId?: string;
}): MemberSeniorityRecord[] {
  return SEED_SENIORITY_ROSTER.filter((record) => {
    if (record.unionId !== filters.unionId) return false;
    if (filters.localId && record.localId !== filters.localId) return false;
    return true;
  });
}
