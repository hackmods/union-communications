import { describe, expect, it } from "vitest";
import {
  clampMobileSheetToViewport,
  isMobileSheetSidePanel,
  readLayoutViewportWidth,
} from "./mobile-sheet-geometry";

describe("readLayoutViewportWidth", () => {
  it("uses the smallest of inner, client, and visual widths", () => {
    expect(
      readLayoutViewportWidth({
        innerWidth: 980,
        visualViewport: { width: 324 },
        document: { documentElement: { clientWidth: 320 } },
      }),
    ).toBe(320);
  });
});

describe("isMobileSheetSidePanel", () => {
  it("pins below 480 CSS px even when a media query would disagree", () => {
    expect(isMobileSheetSidePanel(320)).toBe(false);
    expect(isMobileSheetSidePanel(479)).toBe(false);
    expect(isMobileSheetSidePanel(480)).toBe(true);
  });
});

describe("clampMobileSheetToViewport", () => {
  it("pins a phone sheet to the live layout width including box-border", () => {
    const panel = document.createElement("div");
    clampMobileSheetToViewport(panel, 320, false);
    expect(panel.style.boxSizing).toBe("border-box");
    expect(panel.style.left).toBe("0px");
    expect(panel.style.right).toBe("auto");
    expect(panel.style.width).toBe("320px");
    expect(panel.style.maxWidth).toBe("320px");
    expect(panel.style.minWidth).toBe("0px");
    expect(panel.style.overflowX).toBe("hidden");
  });

  it("clears the phone pin so the 480px side rail can size from CSS", () => {
    const panel = document.createElement("div");
    clampMobileSheetToViewport(panel, 320, false);
    clampMobileSheetToViewport(panel, 800, true);
    expect(panel.style.left).toBe("");
    expect(panel.style.right).toBe("");
    expect(panel.style.width).toBe("");
    expect(panel.style.maxWidth).toBe("");
    expect(panel.style.minWidth).toBe("0px");
  });
});
