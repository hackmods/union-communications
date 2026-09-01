import { describe, expect, it } from "vitest";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  createLedgerEntrySchema,
  updateLedgerEntrySchema,
} from "@/lib/validation/ledger";

const validCreate = {
  date: "2026-08-20",
  description: "Solidarity lunch refund",
  amount: 40,
  type: "income" as const,
  category: "social",
};

describe("ledger request schemas", () => {
  it("rejects tenant identity keys and non-positive amounts on create", () => {
    expect(parseJsonBody(createLedgerEntrySchema, validCreate).ok).toBe(true);
    expect(
      parseJsonBody(createLedgerEntrySchema, {
        ...validCreate,
        unionId: "union-other",
        localId: "local-evil",
        recordedById: "attacker",
      }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(createLedgerEntrySchema, { ...validCreate, amount: 0 }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(createLedgerEntrySchema, { ...validCreate, amount: -5 }).ok,
    ).toBe(false);
  });

  it("allows partial updates and still blocks mass-assigned tenant fields", () => {
    expect(
      parseJsonBody(updateLedgerEntrySchema, { description: "Corrected" }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(updateLedgerEntrySchema, {
        description: "Corrected",
        unionId: "union-other",
      }).ok,
    ).toBe(false);
  });
});
