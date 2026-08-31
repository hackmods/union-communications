import { describe, expect, it } from "vitest";
import {
  createExpenseClaimSchema,
  updateExpenseClaimSchema,
} from "@/lib/validation/travel";

describe("travel claim request validation", () => {
  const lineItem = {
    date: "2026-09-01",
    category: "travel",
    amount: 120,
    description: "Train",
  };

  it("rejects tenant identity keys and empty line item lists on create", () => {
    expect(
      createExpenseClaimSchema.safeParse({
        lineItems: [lineItem],
        unionId: "union-other",
        localId: "local-evil",
        claimantId: "attacker",
      }).success,
    ).toBe(false);
    expect(createExpenseClaimSchema.safeParse({ lineItems: [] }).success).toBe(
      false,
    );
    expect(
      createExpenseClaimSchema.safeParse({
        lineItems: [{ ...lineItem, amount: -5 }],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown keys and illegal status on update", () => {
    expect(
      updateExpenseClaimSchema.safeParse({
        status: "submitted",
        unionId: "union-other",
      }).success,
    ).toBe(false);
    expect(
      updateExpenseClaimSchema.safeParse({ status: "reconciled" }).success,
    ).toBe(false);
    expect(
      updateExpenseClaimSchema.safeParse({ status: "submitted" }).success,
    ).toBe(true);
  });
});
