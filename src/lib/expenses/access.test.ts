import { describe, expect, it } from "vitest";
import {
  canAccessExpensesModule,
  canEditDraftExpense,
  canElevateExpenses,
} from "./access";
import { sumLineItems } from "./totals";
import type { ExpenseSubmission } from "@/types/expenses";

const baseSubmission: ExpenseSubmission = {
  id: "es-1",
  unionId: "u1",
  localId: "l1",
  submittedById: "user-steward",
  submittedByName: "Sam Steward",
  title: "Office supplies",
  purpose: "Printer paper and pens for steward desk",
  status: "draft",
  lineItems: [
    {
      id: "eli-1",
      date: "2026-07-01",
      category: "supplies",
      amount: 45.5,
      description: "Staples run",
    },
  ],
  totalAmount: 45.5,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("expenses access", () => {
  it("allows stewards and treasurers", () => {
    expect(canAccessExpensesModule(["local_steward"])).toBe(true);
    expect(canAccessExpensesModule(["local_exec"])).toBe(true);
    expect(canAccessExpensesModule(["local_president"])).toBe(true);
    expect(canAccessExpensesModule([])).toBe(false);
  });

  it("elevates president/exec for approval", () => {
    expect(canElevateExpenses(["local_steward"])).toBe(false);
    expect(canElevateExpenses(["local_exec"])).toBe(true);
    expect(canElevateExpenses(["local_president"])).toBe(true);
  });

  it("lets claimant edit own draft only", () => {
    expect(
      canEditDraftExpense(baseSubmission, "user-steward", ["local_steward"]),
    ).toBe(true);
    expect(
      canEditDraftExpense(baseSubmission, "other", ["local_steward"]),
    ).toBe(false);
    expect(
      canEditDraftExpense(
        { ...baseSubmission, status: "submitted" },
        "user-steward",
        ["local_steward"],
      ),
    ).toBe(false);
  });
});

describe("expenses totals", () => {
  it("sums line items", () => {
    expect(sumLineItems(baseSubmission.lineItems)).toBe(45.5);
  });
});
