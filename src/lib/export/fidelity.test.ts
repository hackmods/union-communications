import { describe, expect, it } from "vitest";
import {
  assertCaptureHasBrandAndInk,
  compareRasters,
  resizeRasterNearest,
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

describe("compareRasters / resizeRasterNearest", () => {
  it("passes identical rasters", () => {
    const data = new Uint8ClampedArray([
      10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255,
    ]);
    const r = compareRasters(
      { data, width: 2, height: 2 },
      { data: new Uint8ClampedArray(data), width: 2, height: 2 },
      { maxDiffRatio: 0.01 },
    );
    expect(r.ok).toBe(true);
    expect(r.diffRatio).toBe(0);
  });

  it("fails when colours diverge past threshold", () => {
    const a = new Uint8ClampedArray([
      0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    ]);
    const b = new Uint8ClampedArray([
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255,
    ]);
    const r = compareRasters(
      { data: a, width: 2, height: 2 },
      { data: b, width: 2, height: 2 },
      { threshold: 10, maxDiffRatio: 0.1 },
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/diff/i);
  });

  it("resizes before compare", () => {
    const small = new Uint8ClampedArray([200, 50, 10, 255]);
    const big = resizeRasterNearest(
      { data: small, width: 1, height: 1 },
      2,
      2,
    );
    expect(big.width).toBe(2);
    expect(big.height).toBe(2);
    expect(big.data[0]).toBe(200);
  });
});
