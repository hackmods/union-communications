import { describe, expect, it } from "vitest";
import {
  TREATMENT_CHROME,
  resolveTreatmentSurface,
  treatmentGraphicInsetClass,
  treatmentGraphicOuterStyle,
  treatmentPulseFrameStyle,
  treatmentTopBandStyle,
  treatmentWalletFrameStyle,
} from "./design-treatment-surface";

const coral = {
  primary: "#D65B60",
  secondary: "#FFFFFF",
  accent: "#823038",
};

describe("resolveTreatmentSurface", () => {
  it("keeps full-colour palette intact", () => {
    const surface = resolveTreatmentSurface("full", coral, "sheet");
    expect(surface.primary).toBe(coral.primary);
    expect(surface.accent).toBe(coral.accent);
    expect(surface.isLightContent).toBe(false);
  });

  it("maps sheet Balanced and Mostly white onto white reading areas", () => {
    const balanced = resolveTreatmentSurface("balanced", coral, "sheet");
    expect(balanced.contentFill).toBe("#FFFFFF");
    expect(balanced.primary).toBe("#FFFFFF");
    expect(balanced.accent).toBe(coral.primary);
    expect(balanced.secondary).toBe(coral.primary);
    expect(balanced.isLightContent).toBe(true);

    const paper = resolveTreatmentSurface("paper", coral, "print");
    expect(paper.contentFill).toBe("#FFFFFF");
    expect(paper.accent).toBe(coral.primary);
  });

  it("uses brand outer fill for field Balanced (graphic inset)", () => {
    const balanced = resolveTreatmentSurface("balanced", coral, "field");
    expect(balanced.outerFill).toBe(coral.primary);
    expect(balanced.contentFill).toBe("#FFFFFF");
    expect(balanced.primary).toBe("#FFFFFF");
  });
});

describe("treatment chrome helpers", () => {
  it("emits canonical print and wallet borders", () => {
    expect(treatmentTopBandStyle("full", coral.primary)).toBeUndefined();
    expect(treatmentTopBandStyle("balanced", coral.primary)).toEqual({
      borderTop: `${TREATMENT_CHROME.printTop.balanced}px solid ${coral.primary}`,
      boxSizing: "border-box",
    });
    expect(treatmentWalletFrameStyle("balanced", coral.primary).border).toContain(
      `${TREATMENT_CHROME.wallet.balancedFrame}px solid`,
    );
    expect(treatmentPulseFrameStyle("paper", coral.primary).border).toContain(
      `${TREATMENT_CHROME.pulse.paperFrame}px solid`,
    );
  });

  it("builds graphic inset class and outer style", () => {
    expect(treatmentGraphicInsetClass("balanced")).toContain("inset-[4%]");
    expect(treatmentGraphicInsetClass("full")).toContain("relative");
    expect(
      treatmentGraphicOuterStyle("balanced", coral.primary, {
        backgroundColor: "#FFFFFF",
      }).backgroundColor,
    ).toBe(coral.primary);
  });
});
