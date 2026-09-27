import { describe, expect, it } from "vitest";
import { resolveOrgChartSheetFill } from "@/components/tools/org-chart/OrgChartCanvas";

describe("resolveOrgChartSheetFill", () => {
  const palette = {
    primary: "#003366",
    secondary: "#FFFFFF",
    accent: "#D65B60",
  };

  it("forces a white sheet independent of treatment when sheetBackground is white", () => {
    const full = resolveOrgChartSheetFill({
      treatment: "full",
      sheetBackground: "white",
      ...palette,
    });
    expect(full.outerFill).toBe("#FFFFFF");
    expect(full.textInk).toBe("#1A1A1A");
    expect(full.headerFill).toBe("#003366");
  });

  it("uses brand treatment fill when sheetBackground is brand", () => {
    const full = resolveOrgChartSheetFill({
      treatment: "full",
      sheetBackground: "brand",
      ...palette,
    });
    expect(full.outerFill).toBe("#003366");
    const paper = resolveOrgChartSheetFill({
      treatment: "paper",
      sheetBackground: "brand",
      ...palette,
    });
    expect(paper.outerFill).toBe("#FFFFFF");
  });
});
