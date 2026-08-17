import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import {
  canvasFromStyleId,
  contentPaddingPx,
  LEGACY_CANVAS_DEFAULTS,
  meetingAlignFromBias,
  normalizeBrandKitCanvas,
  officeMockTypography,
  resolveCanvasTokens,
  typeScaleFactor,
  walletBodyFontSizePx,
  walletContentGapPx,
  walletContentPaddingPx,
  walletMetaFontSizePx,
  walletTitleFontSizePx,
  bannerPadPercent,
  clampTypeRem,
  officeMockPaddingPx,
} from "./canvas-tokens";

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
        headlineFontId: "oswald",
        bodyFontId: "sourceSerif",
      }),
    ).toEqual({
      styleId: "field",
      surface: "grain",
      qrPlate: "inset",
      headlineFontId: "oswald",
      bodyFontId: "sourceSerif",
    });
  });

  it("migrates legacy Flyer font ids on Brand Kit canvas", () => {
    expect(
      normalizeBrandKitCanvas({
        headlineFontId: "impact",
        bodyFontId: "serif",
      }),
    ).toEqual({
      headlineFontId: "oswald",
      bodyFontId: "sourceSerif",
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
    expect(tokens.headlineFontId).toBe("montserrat");
    expect(tokens.bodyFontId).toBe("sourceSans");
    expect(tokens.headlineFontFamily).toContain("var(--font-montserrat)");
    expect(tokens.bodyFontFamily).toContain("var(--font-source-sans)");
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

describe("layout matrix helpers", () => {
  it("typeScaleFactor ranks display > compact > dense", () => {
    const display = typeScaleFactor(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { typeScale: "display" },
        }),
      ),
    );
    const compact = typeScaleFactor(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { typeScale: "compact" },
        }),
      ),
    );
    const dense = typeScaleFactor(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { typeScale: "dense" },
        }),
      ),
    );
    expect(display).toBeGreaterThan(compact);
    expect(compact).toBeGreaterThan(dense);
  });

  it("meetingAlignFromBias keeps face-safe defaults for asymmetric", () => {
    expect(meetingAlignFromBias("right", "asymmetric")).toBe("right");
    expect(meetingAlignFromBias("right", "center")).toBe("center");
    expect(meetingAlignFromBias("right", "start")).toBe("left");
  });

  it("contentPaddingPx shrinks for portrait and tight density", () => {
    const roomy = contentPaddingPx(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { density: "roomy" },
        }),
      ),
    );
    const tightPortrait = contentPaddingPx(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { density: "tight" },
        }),
      ),
      { portrait: true },
    );
    expect(roomy).toBeGreaterThan(tightPortrait);
  });
});

describe("officeMockTypography", () => {
  it("scales display above compact above dense for doc titles", () => {
    const display = officeMockTypography(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { ...canvasFromStyleId("solid"), typeScale: "display" },
        }),
      ),
    );
    const compact = officeMockTypography(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { typeScale: "compact" },
        }),
      ),
    );
    const dense = officeMockTypography(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { typeScale: "dense" },
        }),
      ),
    );
    expect(display.docTitlePx).toBeGreaterThanOrEqual(compact.docTitlePx);
    expect(compact.docTitlePx).toBeGreaterThanOrEqual(dense.docTitlePx);
    expect(display.headerTitlePx).toBeGreaterThanOrEqual(dense.headerTitlePx);
  });
});

describe("wallet chrome helpers", () => {
  const letterPreviewPx = 8.5 * 48;
  const compactPreviewPx = 4 * 48;

  it("walletTitleFontSizePx scales with typeScale and preview width", () => {
    const display = walletTitleFontSizePx(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { typeScale: "display" },
        }),
      ),
      letterPreviewPx,
    );
    const dense = walletTitleFontSizePx(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { typeScale: "dense" },
        }),
      ),
      letterPreviewPx,
    );
    const compactCard = walletTitleFontSizePx(
      resolveCanvasTokens(DEFAULT_BRAND_KIT),
      compactPreviewPx,
    );
    expect(display).toBeGreaterThan(dense);
    expect(display).toBeGreaterThan(compactCard);
    expect(
      walletTitleFontSizePx(resolveCanvasTokens(DEFAULT_BRAND_KIT), letterPreviewPx, {
        reference: true,
      }),
    ).toBeLessThan(
      walletTitleFontSizePx(resolveCanvasTokens(DEFAULT_BRAND_KIT), letterPreviewPx),
    );
  });

  it("wallet body/meta/pad/gap stay readable on small cards", () => {
    const tokens = resolveCanvasTokens(
      normalizeBrandKit({
        ...DEFAULT_BRAND_KIT,
        canvas: canvasFromStyleId("workshop"),
      }),
    );
    expect(walletBodyFontSizePx(tokens, compactPreviewPx)).toBeGreaterThanOrEqual(9);
    expect(walletMetaFontSizePx(tokens, compactPreviewPx)).toBeGreaterThanOrEqual(9);
    expect(walletMetaFontSizePx(tokens, letterPreviewPx)).toBeGreaterThan(
      walletMetaFontSizePx(tokens, compactPreviewPx),
    );
    expect(walletContentPaddingPx(tokens, compactPreviewPx)).toBeGreaterThanOrEqual(8);
    expect(walletContentGapPx(tokens, compactPreviewPx)).toBeGreaterThanOrEqual(4);
    expect(walletContentPaddingPx(tokens, letterPreviewPx)).toBeGreaterThan(
      walletContentPaddingPx(tokens, compactPreviewPx),
    );
  });

  it("wallet square helpers boost type vs letter-width ratio and cap display scale", () => {
    const displayTokens = resolveCanvasTokens(
      normalizeBrandKit({
        ...DEFAULT_BRAND_KIT,
        canvas: { typeScale: "display" },
      }),
    );
    const square5Px = 5 * 48;
    const square4Px = 4 * 48;
    const letterRatio = walletTitleFontSizePx(displayTokens, square5Px);
    const squareRatio = walletTitleFontSizePx(displayTokens, square5Px, {
      square: true,
    });
    expect(squareRatio).toBeGreaterThan(letterRatio);
    expect(
      walletTitleFontSizePx(displayTokens, square5Px, { square: true }),
    ).toBeGreaterThan(
      walletTitleFontSizePx(displayTokens, square4Px, { square: true }),
    );
    expect(
      walletTitleFontSizePx(displayTokens, square5Px, { square: true }),
    ).toBeLessThanOrEqual(
      Math.round(displayTokens.titleFontSizePx * 1.05),
    );
  });
});

describe("banner clamp helpers", () => {
  it("clampTypeRem grows with display typeScale", () => {
    const display = clampTypeRem(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { typeScale: "display" },
        }),
      ),
      1,
      2,
      3,
    );
    const dense = clampTypeRem(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { typeScale: "dense" },
        }),
      ),
      1,
      2,
      3,
    );
    expect(display).toContain("rem");
    expect(display).not.toEqual(dense);
  });

  it("bannerPadPercent follows density", () => {
    expect(bannerPadPercent(undefined)).toBe(4);
    expect(
      bannerPadPercent(
        resolveCanvasTokens(
          normalizeBrandKit({
            ...DEFAULT_BRAND_KIT,
            canvas: { density: "tight" },
          }),
        ),
      ),
    ).toBe(3);
    expect(
      bannerPadPercent(
        resolveCanvasTokens(
          normalizeBrandKit({
            ...DEFAULT_BRAND_KIT,
            canvas: { density: "roomy" },
          }),
        ),
      ),
    ).toBe(5);
  });
});

describe("officeMockPaddingPx", () => {
  it("tracks density", () => {
    const roomy = officeMockPaddingPx(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { density: "roomy" },
        }),
      ),
    );
    const tight = officeMockPaddingPx(
      resolveCanvasTokens(
        normalizeBrandKit({
          ...DEFAULT_BRAND_KIT,
          canvas: { density: "tight" },
        }),
      ),
    );
    expect(roomy).toBeGreaterThan(tight);
    expect(officeMockPaddingPx(undefined)).toBe(16);
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
