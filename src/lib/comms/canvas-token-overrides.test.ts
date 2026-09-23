import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import {
  hasCanvasTokenOverrides,
  resolveCanvasTokensWithOverrides,
} from "./canvas-token-overrides";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";

describe("canvas-token-overrides", () => {
  it("detects empty vs set overrides", () => {
    expect(hasCanvasTokenOverrides({})).toBe(false);
    expect(hasCanvasTokenOverrides({ typeScale: "display" })).toBe(true);
  });

  it("resolves tool overrides without mutating Brand Kit canvas", () => {
    const kit = {
      ...DEFAULT_BRAND_KIT,
      canvas: { typeScale: "compact" as const, density: "roomy" as const },
    };
    const base = resolveCanvasTokens(kit);
    const overridden = resolveCanvasTokensWithOverrides(kit, {
      typeScale: "display",
      density: "tight",
    });
    expect(overridden.typeScale).toBe("display");
    expect(overridden.density).toBe("tight");
    expect(overridden.titleFontSizePx).toBeGreaterThan(base.titleFontSizePx);
    expect(kit.canvas?.typeScale).toBe("compact");
  });
});
