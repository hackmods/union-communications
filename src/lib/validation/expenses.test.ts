import { describe, expect, it } from "vitest";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  createExpenseSubmissionSchema,
  denyExpenseSubmissionSchema,
  updateExpenseSubmissionSchema,
} from "@/lib/validation/expenses";

const lineItem = {
  date: "2026-08-01",
  category: "supplies",
  amount: 45.5,
  description: "Staples run",
};

describe("expense request schemas", () => {
  it("rejects tenant identity keys on create and empty line item lists", () => {
    expect(
      parseJsonBody(createExpenseSubmissionSchema, {
        title: "Printer paper",
        purpose: "Steward desk",
        lineItems: [lineItem],
      }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(createExpenseSubmissionSchema, {
        title: "Printer paper",
        purpose: "Steward desk",
        lineItems: [lineItem],
        unionId: "union-other",
        localId: "local-evil",
        submittedById: "attacker",
      }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(createExpenseSubmissionSchema, {
        title: "Printer paper",
        purpose: "Steward desk",
        lineItems: [],
      }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(createExpenseSubmissionSchema, {
        title: "Printer paper",
        purpose: "Steward desk",
        lineItems: [{ ...lineItem, amount: -5 }],
      }).ok,
    ).toBe(false);
  });

  it("rejects unknown keys and illegal status on update", () => {
    expect(
      parseJsonBody(updateExpenseSubmissionSchema, {
        status: "submitted",
      }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(updateExpenseSubmissionSchema, {
        status: "approved",
        unionId: "union-other",
      }).ok,
    ).toBe(false);
  });

  it("allows an optional deny reason and still blocks extra keys", () => {
    expect(parseJsonBody(denyExpenseSubmissionSchema, {}).ok).toBe(true);
    expect(
      parseJsonBody(denyExpenseSubmissionSchema, { reason: "No receipt" }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(denyExpenseSubmissionSchema, {
        reason: "No receipt",
        unionId: "union-other",
      }).ok,
    ).toBe(false);
  });
});
