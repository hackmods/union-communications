import { describe, expect, it } from "vitest";
import { computePreviewScale } from "./preview-scale";

describe("computePreviewScale", () => {
  it("returns 1 when content already fits", () => {
    expect(computePreviewScale(200, 100, 400, 200)).toBe(1);
  });

  it("scales down to fit max height", () => {
    expect(computePreviewScale(300, 600, 300, 120)).toBeCloseTo(0.2);
  });

  it("scales down to fit container width", () => {
    expect(computePreviewScale(800, 200, 400, 400)).toBeCloseTo(0.5);
  });

  it("uses the tighter constraint", () => {
    expect(computePreviewScale(400, 800, 200, 200)).toBeCloseTo(0.25);
  });

  it("returns 1 for invalid dimensions", () => {
    expect(computePreviewScale(0, 100, 200, 100)).toBe(1);
    expect(computePreviewScale(100, 100, 0, 100)).toBe(1);
    expect(computePreviewScale(-1, 100, 200, 100)).toBe(1);
  });
});
