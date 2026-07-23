import { describe, it, expect } from "vitest";
import { compareSeniority, rankEligibleBumpers } from "@/lib/bumping/seniority";
import { SEED_SENIORITY_ROSTER } from "@/lib/bumping/seniority-roster";
import type { MemberSeniorityRecord } from "@/types/bumping";

function record(
  partial: Partial<MemberSeniorityRecord> &
    Pick<MemberSeniorityRecord, "id" | "seniorityDate" | "classification">,
): MemberSeniorityRecord {
  return {
    unionId: "union-opseu",
    localId: "local-243",
    memberRef: partial.id,
    active: true,
    ...partial,
  };
}

describe("compareSeniority", () => {
  it("ranks earlier date as more senior", () => {
    expect(
      compareSeniority(
        { seniorityDate: "2015-01-01" },
        { seniorityDate: "2018-01-01" },
      ),
    ).toBe(-1);
    expect(
      compareSeniority(
        { seniorityDate: "2018-01-01" },
        { seniorityDate: "2015-01-01" },
      ),
    ).toBe(1);
  });

  it("returns 0 for equal dates", () => {
    expect(
      compareSeniority(
        { seniorityDate: "2016-06-15" },
        { seniorityDate: "2016-06-15" },
      ),
    ).toBe(0);
  });
});

describe("rankEligibleBumpers", () => {
  const roster: MemberSeniorityRecord[] = [
    record({
      id: "a",
      seniorityDate: "2018-01-01",
      classification: "Clerk",
    }),
    record({
      id: "b",
      seniorityDate: "2015-01-01",
      classification: "Clerk",
    }),
    record({
      id: "c",
      seniorityDate: "2010-01-01",
      classification: "Clerk",
      active: false,
    }),
    record({
      id: "d",
      seniorityDate: "2012-01-01",
      classification: "Analyst",
    }),
  ];

  it("filters active matching classification and sorts most senior first", () => {
    const ranked = rankEligibleBumpers("Clerk", roster);
    expect(ranked.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("excludes inactive and other classifications", () => {
    const ranked = rankEligibleBumpers("Clerk", roster);
    expect(ranked.every((r) => r.active)).toBe(true);
    expect(ranked.every((r) => r.classification === "Clerk")).toBe(true);
    expect(ranked.find((r) => r.id === "c")).toBeUndefined();
    expect(ranked.find((r) => r.id === "d")).toBeUndefined();
  });

  it("returns empty when no matches", () => {
    expect(rankEligibleBumpers("Unknown", roster)).toEqual([]);
  });

  it("does not mutate the input roster", () => {
    const copy = roster.slice();
    rankEligibleBumpers("Clerk", roster);
    expect(roster).toEqual(copy);
  });

  it("ranks seed roster for Administrative Assistant I", () => {
    const ranked = rankEligibleBumpers(
      "Administrative Assistant I",
      SEED_SENIORITY_ROSTER.filter(
        (r) => r.unionId === "union-opseu" && r.localId === "local-243",
      ),
    );
    // Active AA I only: A (2015), E (2016), B (2017) — D inactive
    expect(ranked.map((r) => r.memberRef)).toEqual([
      "Member A",
      "Member E",
      "Member B",
    ]);
  });
});
