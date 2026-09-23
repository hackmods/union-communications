import { describe, expect, it } from "vitest";
import {
  opseuBrandBaselineSuggestion,
  opseuPilotChecklist,
  opseuRecommendedSourceIds,
} from "@/lib/customization/opseu-pilot";

describe("OPSEU pilot customization helpers", () => {
  it("suggests Brand Kit colours without inventing national guide prose", () => {
    const brand = opseuBrandBaselineSuggestion();
    expect(brand?.primaryColor).toBe("#003DA5");
    expect(brand?.resourceKey).toBe("brand:baseline");
  });

  it("lists only registry sources already scoped to OPSEU", () => {
    const ids = opseuRecommendedSourceIds();
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toEqual(expect.arrayContaining(["opseu-home", "opseu-branding"]));
  });

  it("includes the bargaining hide path in the operator checklist", () => {
    const checklist = opseuPilotChecklist();
    expect(checklist.hiddenGuides).toEqual(
      expect.arrayContaining(["/guide/bargaining", "/learn/bargaining"]),
    );
    expect(checklist.divisionLabels.map((row) => row.code)).toEqual(["academic", "support"]);
  });
});
