import { describe, expect, it } from "vitest";
import { resolveExportPixelRatio } from "@/components/canvas-core/use-canvas-export";
import {
  DEFAULT_LOGO_BOUNDS,
  WIDE_LOCKUP_BOUNDS,
  MARK_BOUNDS,
} from "@/components/canvas-core/types";
import { contentPadCqw, safeZoneInsets } from "@/components/canvas-core/safe-zone";

describe("canvas-core contracts", () => {
  it("resolveExportPixelRatio hits browser-safe letter target", () => {
    expect(resolveExportPixelRatio(850, 1700)).toBe(2);
    expect(resolveExportPixelRatio(850, 1700, 4)).toBe(4);
    expect(resolveExportPixelRatio(100, 1700)).toBe(6);
  });

  it("logo bounds keep wide lockups under half the canvas", () => {
    expect(DEFAULT_LOGO_BOUNDS.maxWidthCqw).toBeLessThanOrEqual(45);
    expect(WIDE_LOCKUP_BOUNDS.maxWidthCqw).toBeLessThanOrEqual(55);
    expect(MARK_BOUNDS.aspectRatio).toBe(1);
  });

  it("safe-zone profiles stay non-zero when enabled", () => {
    expect(safeZoneInsets("print").top).toBeGreaterThan(0);
    expect(safeZoneInsets("none").top).toBe(0);
    expect(contentPadCqw("default")).toBe(10);
  });
});
