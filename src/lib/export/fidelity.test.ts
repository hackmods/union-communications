import { describe, expect, it } from "vitest";
import {
  assertCaptureHasBrandAndInk,
  sampleImageData,
} from "./fidelity";

describe("sampleImageData / assertCaptureHasBrandAndInk", () => {
  it("detects a branded field with light ink", () => {
    // 2×2: primary, white, primary, white
    const data = new Uint8ClampedArray([
      194, 65, 12, 255, 255, 255, 255, 255, 194, 65, 12, 255, 255, 255, 255,
      255,
    ]);
    const sample = sampleImageData(data, 2, 2, { step: 1 });
    expect(sample.orangeish).toBe(2);
    expect(sample.lightInk).toBe(2);

    const check = assertCaptureHasBrandAndInk(sample, {
      minField: 1,
      minInk: 1,
    });
    expect(check.ok).toBe(true);
  });

  it("fails when the raster is field-only (washed-out type)", () => {
    const data = new Uint8ClampedArray([194, 65, 12, 255, 194, 65, 12, 255]);
    const sample = sampleImageData(data, 2, 1, { step: 1 });
    const check = assertCaptureHasBrandAndInk(sample, {
      minField: 1,
      minInk: 1,
    });
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/ink\/detail/i);
  });
});
