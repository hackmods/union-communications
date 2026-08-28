import { describe, expect, it } from "vitest";
import {
  RULES_OF_ORDER_ACTION_IDS,
  RULES_OF_ORDER_CATEGORIES,
  RULES_OF_ORDER_DETAIL_FIELDS,
  getCategoryForAction,
} from "./actions";

describe("rules-of-order actions", () => {
  it("covers every action id exactly once across categories", () => {
    const fromCategories = RULES_OF_ORDER_CATEGORIES.flatMap((c) => [
      ...c.actionIds,
    ]);
    expect(fromCategories.sort()).toEqual([...RULES_OF_ORDER_ACTION_IDS].sort());
    expect(new Set(fromCategories).size).toBe(RULES_OF_ORDER_ACTION_IDS.length);
  });

  it("exposes stable detail fields for the cheat sheet", () => {
    expect(RULES_OF_ORDER_DETAIL_FIELDS).toContain("whatToSay");
    expect(RULES_OF_ORDER_DETAIL_FIELDS).toContain("chairNote");
  });

  it("resolves a category for every action", () => {
    for (const id of RULES_OF_ORDER_ACTION_IDS) {
      expect(getCategoryForAction(id)).toMatch(/^(motions|points|meeting)$/);
    }
  });
});
