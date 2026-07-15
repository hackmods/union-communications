import { describe, expect, it } from "vitest";
import {
  LOGO_RECT_ASPECT,
  logoContainBoxPct,
  logoContainPlacementBox,
  placementToFlexClass,
  placementToObjectPosition,
} from "./resizer-layout";

describe("resizer-layout", () => {
  it("sizes square contain to the shorter padded side on a wide banner", () => {
    // 820×312 FB cover, 8% pad → inner 688.8×262.08 → side 262.08
    const side = 312 * 0.84;
    const box = logoContainBoxPct(820, 312, "square");
    expect(box.heightPct).toBeCloseTo((side / 312) * 100, 5);
    expect(box.widthPct).toBeCloseTo((side / 820) * 100, 5);
    expect(box.widthPct).toBeLessThan(40);
    expect(box.heightPct).toBeCloseTo(84, 5);
  });

  it("sizes square contain to width on a tall story", () => {
    const box = logoContainBoxPct(1080, 1920, "circle");
    const innerW = 1080 * 0.84;
    expect(box.widthPct).toBeCloseTo((innerW / 1080) * 100, 5);
    expect(box.heightPct).toBeCloseTo((innerW / 1920) * 100, 5);
  });

  it("keeps rectangle aspect inside the padded frame", () => {
    const box = logoContainBoxPct(1080, 1080, "rectangle");
    const w = (box.widthPct / 100) * 1080;
    const h = (box.heightPct / 100) * 1080;
    expect(w / h).toBeCloseTo(LOGO_RECT_ASPECT, 5);
    expect(box.widthPct).toBeLessThanOrEqual(84.01);
    expect(box.heightPct).toBeLessThanOrEqual(84.01);
  });

  it("places top-left and bottom-right with padding", () => {
    const tl = logoContainPlacementBox(1000, 1000, "square", "top-left");
    expect(tl.leftPct).toBeCloseTo(8);
    expect(tl.topPct).toBeCloseTo(8);

    const br = logoContainPlacementBox(1000, 1000, "square", "bottom-right");
    expect(br.leftPct + br.widthPct).toBeCloseTo(92);
    expect(br.topPct + br.heightPct).toBeCloseTo(92);
  });

  it("centers by default box math", () => {
    const c = logoContainPlacementBox(1000, 500, "square", "center");
    expect(c.leftPct).toBeCloseTo((100 - c.widthPct) / 2);
    expect(c.topPct).toBeCloseTo((100 - c.heightPct) / 2);
  });

  it("maps placement to object-position and flex classes", () => {
    expect(placementToObjectPosition("top-left")).toBe("left top");
    expect(placementToObjectPosition("center")).toBe("center center");
    expect(placementToObjectPosition("bottom-right")).toBe("right bottom");
    expect(placementToFlexClass("top-left")).toContain("justify-start");
    expect(placementToFlexClass("top-left")).toContain("items-start");
    expect(placementToFlexClass("center")).toContain("justify-center");
    expect(placementToFlexClass("center")).toContain("items-center");
  });
});
