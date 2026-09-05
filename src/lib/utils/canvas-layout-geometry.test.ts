import { describe, expect, it } from "vitest";
import {
  PLATE_ASPECT_MAX,
  PLATE_ASPECT_MIN,
  clipRect,
  plateAspectOk,
  rectOutside,
  countOverlappingPairs,
  rectsOverlap,
} from "./canvas-layout-geometry";

const box = (
  left: number,
  top: number,
  right: number,
  bottom: number,
) => ({ left, top, right, bottom });

describe("clipRect", () => {
  it("clips an overflowing caption to the cell", () => {
    const url = box(0, 80, 120, 140);
    const cell = box(0, 0, 100, 100);
    expect(clipRect(url, cell)).toEqual(box(0, 80, 100, 100));
  });

  it("returns null when the caption is fully outside the cell", () => {
    expect(clipRect(box(0, 120, 80, 160), box(0, 0, 100, 100))).toBeNull();
  });

  it("keeps a caption that already sits inside the cell", () => {
    const url = box(10, 70, 90, 95);
    expect(clipRect(url, box(0, 0, 100, 100))).toEqual(url);
  });
});

describe("rectsOverlap", () => {
  it("detects plate/caption overlap above the min px", () => {
    expect(rectsOverlap(box(0, 0, 80, 80), box(40, 40, 120, 120), 1)).toBe(
      true,
    );
  });

  it("ignores a 1px grazing edge", () => {
    expect(rectsOverlap(box(0, 0, 80, 80), box(80, 0, 160, 80), 1)).toBe(
      false,
    );
  });
});

describe("plateAspectOk", () => {
  it("accepts near-square plates", () => {
    expect(plateAspectOk(1)).toBe(true);
    expect(plateAspectOk(0.9)).toBe(true);
    expect(plateAspectOk(1.1)).toBe(true);
  });

  it("rejects tall rectangles and flat bars", () => {
    expect(plateAspectOk(0.5)).toBe(false);
    expect(plateAspectOk(2)).toBe(false);
    expect(plateAspectOk(PLATE_ASPECT_MIN)).toBe(false);
    expect(plateAspectOk(PLATE_ASPECT_MAX)).toBe(false);
  });
});

describe("rectOutside", () => {
  it("flags a plate that spills past the export root", () => {
    expect(rectOutside(box(-4, 0, 80, 80), box(0, 0, 200, 200))).toBe(true);
    expect(rectOutside(box(10, 10, 80, 80), box(0, 0, 200, 200))).toBe(false);
  });
});

describe("countOverlappingPairs", () => {
  it("counts each overlapping pair once", () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 };
    const b = { left: 5, top: 5, right: 15, bottom: 15 };
    const c = { left: 20, top: 20, right: 30, bottom: 30 };
    expect(countOverlappingPairs([a, b, c])).toBe(1);
  });
});
