import { describe, expect, it } from "vitest";
import {
  getReferenceSheets,
  getRelatedResources,
  MODULE_REFERENCE_SHEETS,
} from "./related-resources";
import { OFFICER_LEARNING_MODULES } from "./modules";

describe("officer learning related resources", () => {
  it("covers every module slug with at least one related link", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      expect(getRelatedResources(meta.slug).length).toBeGreaterThan(0);
    }
  });

  it("provides a module-specific sheet plus floor checklist for every module", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      const sheets = getReferenceSheets(meta.slug);
      expect(sheets).toHaveLength(2);
      expect(sheets.some((s) => s.id === "floor-checklist")).toBe(true);
      expect(sheets.some((s) => s.id !== "floor-checklist")).toBe(true);
      expect(MODULE_REFERENCE_SHEETS[meta.slug]).toBeDefined();
    }
  });

  it("maps contract enforcement to FAR + checklist", () => {
    expect(getReferenceSheets("contract-enforcement").map((s) => s.id)).toEqual([
      "far-sheet",
      "floor-checklist",
    ]);
  });
});
