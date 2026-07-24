import { describe, expect, it } from "vitest";
import { entryDelta, withRunningBalance } from "./running-balance";
import type { LedgerEntry } from "@/types/ledger";

function entry(
  partial: Partial<LedgerEntry> & Pick<LedgerEntry, "id" | "amount" | "type">,
): LedgerEntry {
  return {
    unionId: "union-a",
    localId: "local-1",
    date: "2026-07-01",
    description: "x",
    category: "general",
    recordedById: "u1",
    ...partial,
  };
}

describe("running balance", () => {
  it("computes signed deltas", () => {
    expect(entryDelta({ type: "income", amount: 50 })).toBe(50);
    expect(entryDelta({ type: "expense", amount: 20 })).toBe(-20);
    expect(entryDelta({ type: "expense", amount: -20 })).toBe(-20);
  });

  it("accumulates chronologically", () => {
    const rows = withRunningBalance([
      entry({ id: "b", date: "2026-07-02", amount: 30, type: "expense" }),
      entry({ id: "a", date: "2026-07-01", amount: 100, type: "income" }),
      entry({ id: "c", date: "2026-07-03", amount: 10, type: "income" }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(rows.map((r) => r.runningBalance)).toEqual([100, 70, 80]);
  });
});
