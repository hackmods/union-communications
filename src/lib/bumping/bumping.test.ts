import { describe, it, expect } from "vitest";
import {
  canEditBumpingCase,
  canViewBumpingCase,
  canWriteBumping,
} from "@/lib/bumping/access";
import { diffLines, positionToCompareText } from "@/lib/bumping/diff";
import { emptyChecklistState } from "@/lib/bumping/checklist";
import type { BumpingCase } from "@/types/bumping";

const sampleCase: BumpingCase = {
  id: "bump-test",
  unionId: "union-opseu",
  localId: "local-243",
  memberRef: "Member X",
  seniorityDate: "2019-01-01",
  currentPosition: "Pos A",
  targetPosition: "Pos B",
  scenario: "Layoff bump",
  status: "open",
  incumbentPosition: {
    title: "Incumbent",
    duties: "Task one",
    qualifications: "Diploma",
    seniorityNotes: "",
  },
  bumpingPosition: {
    title: "Bumping",
    duties: "Task two",
    qualifications: "Diploma plus experience",
    seniorityNotes: "",
  },
  checklist: emptyChecklistState(),
  createdById: "user-president-243",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("bumping access", () => {
  it("allows president to view local case", () => {
    expect(
      canViewBumpingCase(
        sampleCase,
        "union-opseu",
        "local-243",
        ["local_president"],
      ),
    ).toBe(true);
  });

  it("allows steward read-only view", () => {
    expect(
      canViewBumpingCase(
        sampleCase,
        "union-opseu",
        "local-243",
        ["local_steward"],
      ),
    ).toBe(true);
    expect(canWriteBumping(["local_steward"])).toBe(false);
  });

  it("allows stability member to edit", () => {
    expect(canWriteBumping(["stability_member"])).toBe(true);
    expect(
      canEditBumpingCase(
        sampleCase,
        "union-opseu",
        "local-243",
        ["stability_member"],
      ),
    ).toBe(true);
  });

  it("blocks cross-local access", () => {
    expect(
      canViewBumpingCase(
        sampleCase,
        "union-opseu",
        "local-999",
        ["local_president"],
      ),
    ).toBe(false);
  });
});

describe("position diff", () => {
  it("detects changed lines", () => {
    const diff = diffLines("line one\nline two", "line one\nline THREE");
    expect(diff.some((d) => d.type === "changed")).toBe(true);
  });

  it("builds compare text from structured fields", () => {
    const text = positionToCompareText(sampleCase.incumbentPosition);
    expect(text).toContain("Incumbent");
    expect(text).toContain("Task one");
  });
});

describe("checklist", () => {
  it("initializes all items as null", () => {
    const state = emptyChecklistState();
    expect(Object.values(state).every((v) => v === null)).toBe(true);
  });
});
