import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import {
  canvasFromStyleId,
  LEGACY_CANVAS_DEFAULTS,
  normalizeBrandKitCanvas,
  resolveCanvasTokens,
} from "@/lib/utils/canvas-tokens";

describe("normalizeBrandKitCanvas", () => {
  it("returns undefined for empty/invalid", () => {
    expect(normalizeBrandKitCanvas(undefined)).toBeUndefined();
    expect(normalizeBrandKitCanvas({})).toBeUndefined();
    expect(normalizeBrandKitCanvas({ styleId: "nope" })).toBeUndefined();
  });

  it("keeps valid fields", () => {
    expect(
      normalizeBrandKitCanvas({
        styleId: "field",
        surface: "grain",
        qrPlate: "inset",
      }),
    ).toEqual({
      styleId: "field",
      surface: "grain",
      qrPlate: "inset",
    });
  });
});

describe("resolveCanvasTokens", () => {
  it("matches legacy look when canvas is unset", () => {
    const tokens = resolveCanvasTokens(DEFAULT_BRAND_KIT);
    expect(tokens.styleId).toBeNull();
    expect(tokens.alignmentBias).toBe(LEGACY_CANVAS_DEFAULTS.alignmentBias);
    expect(tokens.density).toBe(LEGACY_CANVAS_DEFAULTS.density);
    expect(tokens.typeScale).toBe(LEGACY_CANVAS_DEFAULTS.typeScale);
    expect(tokens.qrPlate).toBe(LEGACY_CANVAS_DEFAULTS.qrPlate);
    expect(tokens.surface).toBe(LEGACY_CANVAS_DEFAULTS.surface);
    expect(tokens.grainOpacity).toBe(0);
    expect(tokens.qrPlateBg).toBe("#FFFFFF");
    expect(tokens.paddingPx).toBe(40);
  });

  it("applies field package with grain", () => {
    const kit = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      canvas: canvasFromStyleId("field"),
    });
    const tokens = resolveCanvasTokens(kit);
    expect(tokens.styleId).toBe("field");
    expect(tokens.surface).toBe("grain");
    expect(tokens.grainOpacity).toBeGreaterThan(0);
    expect(tokens.qrPlate).toBe("inset");
    expect(tokens.alignmentBias).toBe("center");
  });

  it("applies solid package soft-gradient", () => {
    const tokens = resolveCanvasTokens(
      normalizeBrandKit({
        ...DEFAULT_BRAND_KIT,
        canvas: canvasFromStyleId("solid"),
      }),
    );
    expect(tokens.surface).toBe("soft-gradient");
    expect(tokens.alignmentBias).toBe("start");
    expect(tokens.qrPlate).toBe("white-card");
  });

  it("applies workshop accent-band flush plate", () => {
    const tokens = resolveCanvasTokens(
      normalizeBrandKit({
        ...DEFAULT_BRAND_KIT,
        canvas: canvasFromStyleId("workshop"),
      }),
    );
    expect(tokens.surface).toBe("accent-band");
    expect(tokens.qrPlate).toBe("flush");
    expect(tokens.qrPlateBorder).toBeTruthy();
  });

  it("honours token overrides over style package", () => {
    const tokens = resolveCanvasTokens(
      normalizeBrandKit({
        ...DEFAULT_BRAND_KIT,
        canvas: {
          styleId: "solid",
          surface: "duotone",
          alignmentBias: "center",
        },
      }),
    );
    expect(tokens.styleId).toBe("solid");
    expect(tokens.surface).toBe("duotone");
    expect(tokens.alignmentBias).toBe("center");
  });
});

describe("normalizeBrandKit canvas", () => {
  it("strips invalid canvas and keeps valid", () => {
    const kit = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      canvas: { styleId: "field", surface: "not-real" },
    });
    expect(kit.canvas).toEqual({ styleId: "field" });
  });
});
