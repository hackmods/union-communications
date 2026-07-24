import { describe, expect, it } from "vitest";
import {
  canAccessLedgerModule,
  canCrossLocalLedger,
  canMutateLedger,
  canViewLedgerEntry,
} from "./access";
import type { LedgerEntry } from "@/types/ledger";

const sample: LedgerEntry = {
  id: "led-1",
  unionId: "union-a",
  localId: "local-1",
  date: "2026-07-01",
  description: "Raffle proceeds",
  amount: 100,
  type: "income",
  category: "fundraising",
  recordedById: "user-1",
};

describe("ledger access", () => {
  it("allows president and local_exec (treasurer), denies steward", () => {
    expect(canAccessLedgerModule(["local_president"])).toBe(true);
    expect(canAccessLedgerModule(["local_exec"])).toBe(true);
    expect(canAccessLedgerModule(["local_steward"])).toBe(false);
    expect(canMutateLedger(["local_steward"])).toBe(false);
  });

  it("scopes cross-local reads to elevated admins", () => {
    expect(canCrossLocalLedger(["union_admin"])).toBe(true);
    expect(canCrossLocalLedger(["local_president"])).toBe(false);
    expect(
      canViewLedgerEntry(sample, "union-a", "local-other", ["local_president"]),
    ).toBe(false);
    expect(
      canViewLedgerEntry(sample, "union-a", "local-other", ["union_admin"]),
    ).toBe(true);
  });

  it("never allows cross-union reads", () => {
    expect(
      canViewLedgerEntry(sample, "union-b", "local-1", ["platform_admin"]),
    ).toBe(false);
  });
});
