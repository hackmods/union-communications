import { describe, expect, it } from "vitest";
import { unionDeleteBlockedReason } from "./union-delete-blocked";
import type { UnionLifecycleRow } from "./union-lifecycle-shared";

const base: Pick<
  UnionLifecycleRow,
  | "archivedAt"
  | "empty"
  | "localCount"
  | "userCount"
  | "inviteCount"
  | "membershipCount"
  | "caseworkCount"
  | "isDemo"
> = {
  archivedAt: "2026-09-20T00:00:00.000Z",
  empty: false,
  localCount: 2,
  userCount: 0,
  inviteCount: 0,
  membershipCount: 0,
  caseworkCount: 0,
  isDemo: false,
};

const t = (key: string, values?: Record<string, string | number | Date>) => {
  if (key === "unionDeleteBlockedLocals") return `${values?.count} locals`;
  if (key === "unionDeleteBlockedSummary") return `Delete unavailable: ${values?.parts}.`;
  if (key === "unionDeleteBlockedJoin") return ", ";
  if (key === "unionDeleteBlockedLocalsHint") return "Open Locals first.";
  if (key === "unionDeleteBlockedDemoHint") return "Use Demo cleanup.";
  if (key === "unionDeleteBlockedGeneric") return "Delete unavailable.";
  return key;
};

describe("unionDeleteBlockedReason", () => {
  it("returns null when active or empty", () => {
    expect(unionDeleteBlockedReason({ ...base, archivedAt: null }, t)).toBeNull();
    expect(unionDeleteBlockedReason({ ...base, empty: true }, t)).toBeNull();
  });

  it("summarizes remaining attachments for archived non-empty unions", () => {
    expect(unionDeleteBlockedReason(base, t)).toBe(
      "Delete unavailable: 2 locals. Open Locals first.",
    );
  });

  it("adds the demo cleanup hint for demo unions", () => {
    expect(unionDeleteBlockedReason({ ...base, isDemo: true }, t)).toBe(
      "Delete unavailable: 2 locals. Use Demo cleanup.",
    );
  });
});
