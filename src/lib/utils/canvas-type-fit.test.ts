import { describe, expect, it } from "vitest";
import {
  CANVAS_TYPE_FIT_MAX_SCALE,
  CANVAS_TYPE_FIT_MIN_SCALE,
  clampTypeFitScale,
  estimateTypeFitScale,
  fittedFontSizePx,
  nextTypeFitScale,
  typeFitOverflows,
} from "./canvas-type-fit";

describe("canvas-type-fit", () => {
  it("keeps full scale when content already fits", () => {
    expect(estimateTypeFitScale(200, 400)).toBe(CANVAS_TYPE_FIT_MAX_SCALE);
  });

  it("shrinks uniformly when content is taller than the slot", () => {
    expect(estimateTypeFitScale(400, 200)).toBeCloseTo(0.5, 5);
  });

  it("never drops below the readability floor", () => {
    expect(estimateTypeFitScale(1000, 100)).toBe(CANVAS_TYPE_FIT_MIN_SCALE);
  });

  it("clamps non-finite scales to the max", () => {
    expect(clampTypeFitScale(Number.NaN)).toBe(CANVAS_TYPE_FIT_MAX_SCALE);
  });

  it("steps down only while overflowing", () => {
    expect(nextTypeFitScale(1, false)).toBe(1);
    expect(nextTypeFitScale(1, true)).toBeLessThan(1);
    expect(nextTypeFitScale(CANVAS_TYPE_FIT_MIN_SCALE, true)).toBe(
      CANVAS_TYPE_FIT_MIN_SCALE,
    );
  });

  it("detects scroll overflow with half-pixel slack", () => {
    expect(typeFitOverflows(100, 200, 100, 200)).toBe(false);
    expect(typeFitOverflows(100, 201, 100, 200)).toBe(true);
    expect(typeFitOverflows(100, 200.4, 100, 200)).toBe(false);
  });

  it("floors fitted font sizes for capture legibility", () => {
    expect(fittedFontSizePx(36, 0.5, 12)).toBe(18);
    expect(fittedFontSizePx(36, 0.2, 12)).toBe(12);
  });
});
