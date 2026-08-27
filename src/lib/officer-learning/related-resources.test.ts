import { describe, expect, it } from "vitest";
import {
  getReferenceSheets,
  getRelatedResources,
  MODULE_RELATED_RESOURCES,
} from "./related-resources";
import { OFFICER_LEARNING_MODULES } from "./modules";
import { collectChecklistItems } from "./reference-pdf";
import { parseOfficerLearningModule } from "./parse-module";
import fs from "node:fs";
import path from "node:path";

describe("officer learning related resources", () => {
  it("covers every module slug with at least one related link", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      expect(getRelatedResources(meta.slug).length).toBeGreaterThan(0);
      expect(MODULE_RELATED_RESOURCES[meta.slug]).toBeDefined();
    }
  });

  it("provides printable sheets for contract enforcement", () => {
    const sheets = getReferenceSheets("contract-enforcement");
    expect(sheets.map((s) => s.id)).toEqual(["far-sheet", "floor-checklist"]);
  });

  it("collects checklist items from parsed module-1", () => {
    const markdown = fs.readFileSync(
      path.join(process.cwd(), "src/content/officer-learning", "module-1.md"),
      "utf-8",
    );
    const parsed = parseOfficerLearningModule("module-1", markdown);
    const items = collectChecklistItems(parsed.sections);
    expect(items.length).toBeGreaterThanOrEqual(6);
  });
});
