import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
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

  it("maps points and meeting actions to their categories", () => {
    expect(getCategoryForAction("mainMotion")).toBe("motions");
    expect(getCategoryForAction("pointOfOrder")).toBe("points");
    expect(getCategoryForAction("pointOfPrivilege")).toBe("points");
    expect(getCategoryForAction("adjourn")).toBe("meeting");
    expect(getCategoryForAction("recess")).toBe("meeting");
  });

  it("has matching EN/FR i18n for every action and detail field", () => {
    const enActions = en.rulesOfOrder.actions as Record<
      string,
      Record<string, string>
    >;
    const frActions = fr.rulesOfOrder.actions as Record<
      string,
      Record<string, string>
    >;

    for (const id of RULES_OF_ORDER_ACTION_IDS) {
      expect(enActions[id], `missing en action ${id}`).toBeTruthy();
      expect(frActions[id], `missing fr action ${id}`).toBeTruthy();
      for (const field of RULES_OF_ORDER_DETAIL_FIELDS) {
        expect(enActions[id][field], `missing en ${id}.${field}`).toBeTruthy();
        expect(frActions[id][field], `missing fr ${id}.${field}`).toBeTruthy();
      }
      expect(enActions[id].label, `missing en label ${id}`).toBeTruthy();
      expect(frActions[id].label, `missing fr label ${id}`).toBeTruthy();
    }
  });
});
