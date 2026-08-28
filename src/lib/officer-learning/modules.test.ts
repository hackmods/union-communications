import { describe, expect, it } from "vitest";
import {
  OFFICER_LEARNING_MODULES,
  getModuleById,
  getModuleBySlug,
  getNextModuleSlug,
} from "./modules";

describe("officer learning catalog", () => {
  it("keeps unique sequential ids and slugs", () => {
    const ids = OFFICER_LEARNING_MODULES.map((m) => m.id);
    const slugs = OFFICER_LEARNING_MODULES.map((m) => m.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(OFFICER_LEARNING_MODULES.map((m) => m.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("resolves modules by slug and id", () => {
    expect(getModuleBySlug("democratic-governance")?.id).toBe("module-4");
    expect(getModuleById("module-4")?.slug).toBe("democratic-governance");
    expect(getModuleBySlug("missing")).toBeUndefined();
  });

  it("returns the next module slug for quiz navigation", () => {
    expect(getNextModuleSlug("contract-enforcement")).toBe(
      "progressive-discipline",
    );
    expect(getNextModuleSlug("financial-health")).toBe(
      "building-collective-power",
    );
    expect(getNextModuleSlug("building-collective-power")).toBeNull();
    expect(getNextModuleSlug("not-a-module")).toBeNull();
  });
});
