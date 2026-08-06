import type {
  BrandKit,
  BrandKitCanvas,
  CanvasAlignmentBias,
  CanvasDensity,
  CanvasQrPlate,
  CanvasStyleId,
  CanvasSurface,
  CanvasTypeScale,
} from "@/types/entities";

/** Resolved metrics for capture-safe canvas primitives */
export interface CanvasTokens {
  styleId: CanvasStyleId | null;
  alignmentBias: CanvasAlignmentBias;
  density: CanvasDensity;
  typeScale: CanvasTypeScale;
  qrPlate: CanvasQrPlate;
  surface: CanvasSurface;
  /** Outer padding (px) for letter-ish canvases */
  paddingPx: number;
  gapPx: number;
  titleFontSizePx: number;
  titleFontWeight: number;
  titleLetterSpacing: string;
  titleTextTransform: "none" | "uppercase";
  subtitleFontSizePx: number;
  qrPlatePaddingPx: number;
  qrPlateRadiusPx: number;
  qrPlateBg: string;
  qrPlateBorder: string | null;
  grainOpacity: number;
  duotoneHighlightOpacity: number;
}

export const CANVAS_STYLE_IDS: readonly CanvasStyleId[] = [
  "solid",
  "field",
  "workshop",
] as const;

const STYLE_PACKAGES: Record<
  CanvasStyleId,
  Required<Omit<BrandKitCanvas, "styleId">>
> = {
  solid: {
    alignmentBias: "start",
    density: "roomy",
    typeScale: "display",
    qrPlate: "white-card",
    surface: "soft-gradient",
  },
  field: {
    alignmentBias: "center",
    density: "tight",
    typeScale: "display",
    qrPlate: "inset",
    surface: "grain",
  },
  workshop: {
    alignmentBias: "start",
    density: "roomy",
    typeScale: "compact",
    qrPlate: "flush",
    surface: "accent-band",
  },
};

/** Legacy export look when Brand Kit has no canvas prefs */
export const LEGACY_CANVAS_DEFAULTS: Required<
  Omit<BrandKitCanvas, "styleId">
> = {
  alignmentBias: "center",
  density: "roomy",
  typeScale: "compact",
  qrPlate: "white-card",
  surface: "flat",
};

function isCanvasStyleId(v: unknown): v is CanvasStyleId {
  return v === "solid" || v === "field" || v === "workshop";
}

function isAlignment(v: unknown): v is CanvasAlignmentBias {
  return v === "center" || v === "start" || v === "asymmetric";
}

function isDensity(v: unknown): v is CanvasDensity {
  return v === "roomy" || v === "tight";
}

function isTypeScale(v: unknown): v is CanvasTypeScale {
  return v === "compact" || v === "display" || v === "dense";
}

function isQrPlate(v: unknown): v is CanvasQrPlate {
  return v === "white-card" || v === "inset" || v === "flush";
}

function isSurface(v: unknown): v is CanvasSurface {
  return (
    v === "flat" ||
    v === "soft-gradient" ||
    v === "accent-band" ||
    v === "grain" ||
    v === "duotone"
  );
}

/** Strip invalid canvas fields; omit empty object. */
export function normalizeBrandKitCanvas(
  raw: unknown,
): BrandKitCanvas | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const input = raw as Record<string, unknown>;
  const out: BrandKitCanvas = {};

  if (isCanvasStyleId(input.styleId)) out.styleId = input.styleId;
  if (isAlignment(input.alignmentBias)) out.alignmentBias = input.alignmentBias;
  if (isDensity(input.density)) out.density = input.density;
  if (isTypeScale(input.typeScale)) out.typeScale = input.typeScale;
  if (isQrPlate(input.qrPlate)) out.qrPlate = input.qrPlate;
  if (isSurface(input.surface)) out.surface = input.surface;

  return Object.keys(out).length > 0 ? out : undefined;
}

function mergeCanvasPrefs(canvas?: BrandKitCanvas): {
  styleId: CanvasStyleId | null;
} & Required<Omit<BrandKitCanvas, "styleId">> {
  const styleId = canvas?.styleId ?? null;
  const fromStyle = styleId ? STYLE_PACKAGES[styleId] : LEGACY_CANVAS_DEFAULTS;
  return {
    styleId,
    alignmentBias: canvas?.alignmentBias ?? fromStyle.alignmentBias,
    density: canvas?.density ?? fromStyle.density,
    typeScale: canvas?.typeScale ?? fromStyle.typeScale,
    qrPlate: canvas?.qrPlate ?? fromStyle.qrPlate,
    surface: canvas?.surface ?? fromStyle.surface,
  };
}

/**
 * Resolve Brand Kit canvas prefs into concrete capture-safe metrics.
 * Unset `canvas` → legacy look (centered, flat, white-card QR).
 */
export function resolveCanvasTokens(brandKit: BrandKit): CanvasTokens {
  const prefs = mergeCanvasPrefs(brandKit.canvas);
  const roomy = prefs.density === "roomy";

  const type =
    prefs.typeScale === "display"
      ? {
          titleFontSizePx: 36,
          titleFontWeight: 900,
          titleLetterSpacing: "0.04em",
          titleTextTransform: "uppercase" as const,
          subtitleFontSizePx: 14,
        }
      : prefs.typeScale === "dense"
        ? {
            titleFontSizePx: 24,
            titleFontWeight: 800,
            titleLetterSpacing: "0.01em",
            titleTextTransform: "none" as const,
            subtitleFontSizePx: 12,
          }
        : {
            titleFontSizePx: 28,
            titleFontWeight: 900,
            titleLetterSpacing: "0.02em",
            titleTextTransform: "uppercase" as const,
            subtitleFontSizePx: 13,
          };

  const plate =
    prefs.qrPlate === "inset"
      ? {
          qrPlatePaddingPx: 10,
          qrPlateRadiusPx: 4,
          qrPlateBg: "#FFFFFF",
          qrPlateBorder: "2px solid rgba(0,0,0,0.12)",
        }
      : prefs.qrPlate === "flush"
        ? {
            qrPlatePaddingPx: 4,
            qrPlateRadiusPx: 0,
            qrPlateBg: "#FFFFFF",
            qrPlateBorder: "1px solid rgba(0,0,0,0.2)",
          }
        : {
            qrPlatePaddingPx: 12,
            qrPlateRadiusPx: 8,
            qrPlateBg: "#FFFFFF",
            qrPlateBorder: null as string | null,
          };

  return {
    ...prefs,
    paddingPx: roomy ? 40 : 28,
    gapPx: roomy ? 16 : 10,
    ...type,
    ...plate,
    grainOpacity: prefs.surface === "grain" ? 0.22 : 0,
    duotoneHighlightOpacity: 0.7,
  };
}

/** Apply a style package; keeps any explicit overrides the caller still wants. */
export function canvasFromStyleId(
  styleId: CanvasStyleId | null,
  overrides?: Omit<BrandKitCanvas, "styleId">,
): BrandKitCanvas | undefined {
  if (!styleId) {
    return overrides && Object.keys(overrides).length > 0
      ? { ...overrides }
      : undefined;
  }
  return {
    styleId,
    ...STYLE_PACKAGES[styleId],
    ...overrides,
  };
}

export function textAlignFromBias(
  bias: CanvasAlignmentBias,
): "left" | "center" | "right" {
  if (bias === "center") return "center";
  return "left";
}

export function flexAlignFromBias(
  bias: CanvasAlignmentBias,
): "flex-start" | "center" {
  if (bias === "center") return "center";
  return "flex-start";
}
