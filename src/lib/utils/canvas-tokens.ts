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
import {
  canvasFontFamily,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
  migrateCanvasFontId,
  type CanvasFontId,
} from "@/lib/comms/canvas-fonts";

/** Resolved metrics for capture-safe canvas primitives */
export interface CanvasTokens {
  styleId: CanvasStyleId | null;
  alignmentBias: CanvasAlignmentBias;
  density: CanvasDensity;
  typeScale: CanvasTypeScale;
  qrPlate: CanvasQrPlate;
  surface: CanvasSurface;
  headlineFontId: CanvasFontId;
  bodyFontId: CanvasFontId;
  /** CSS font-family for titles / display type */
  headlineFontFamily: string;
  /** CSS font-family for body / supporting type */
  bodyFontFamily: string;
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
    headlineFontId: DEFAULT_HEADLINE_FONT,
    bodyFontId: DEFAULT_BODY_FONT,
  },
  field: {
    alignmentBias: "center",
    density: "tight",
    typeScale: "display",
    qrPlate: "inset",
    surface: "grain",
    headlineFontId: DEFAULT_HEADLINE_FONT,
    bodyFontId: DEFAULT_BODY_FONT,
  },
  workshop: {
    alignmentBias: "start",
    density: "roomy",
    typeScale: "compact",
    qrPlate: "flush",
    surface: "accent-band",
    headlineFontId: DEFAULT_HEADLINE_FONT,
    bodyFontId: DEFAULT_BODY_FONT,
  },
};

/** Defaults when Brand Kit has no canvas prefs (OPSEU-like digital sans pair). */
export const LEGACY_CANVAS_DEFAULTS: Required<
  Omit<BrandKitCanvas, "styleId">
> = {
  alignmentBias: "center",
  density: "roomy",
  typeScale: "compact",
  qrPlate: "white-card",
  surface: "flat",
  headlineFontId: DEFAULT_HEADLINE_FONT,
  bodyFontId: DEFAULT_BODY_FONT,
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
  const headline = migrateCanvasFontId(input.headlineFontId);
  if (headline) out.headlineFontId = headline;
  const body = migrateCanvasFontId(input.bodyFontId);
  if (body) out.bodyFontId = body;

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
    headlineFontId:
      migrateCanvasFontId(canvas?.headlineFontId) ??
      (fromStyle.headlineFontId as CanvasFontId),
    bodyFontId:
      migrateCanvasFontId(canvas?.bodyFontId) ??
      (fromStyle.bodyFontId as CanvasFontId),
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

  const headlineFontId = prefs.headlineFontId as CanvasFontId;
  const bodyFontId = prefs.bodyFontId as CanvasFontId;

  return {
    ...prefs,
    headlineFontId,
    bodyFontId,
    headlineFontFamily: canvasFontFamily(headlineFontId),
    bodyFontFamily: canvasFontFamily(bodyFontId),
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
  // start + asymmetric → left in generic type blocks (asymmetric offsets via padding)
  return "left";
}

export function flexAlignFromBias(
  bias: CanvasAlignmentBias,
): "flex-start" | "center" {
  if (bias === "center") return "center";
  return "flex-start";
}

/**
 * Face-safe meeting layouts keep their default anchor when bias is `asymmetric`.
 * `center` / `start` override to global center / left.
 */
export function meetingAlignFromBias(
  layoutDefault: "left" | "right" | "center",
  bias: CanvasAlignmentBias,
): "left" | "right" | "center" {
  if (bias === "asymmetric") return layoutDefault;
  if (bias === "center") return "center";
  return "left";
}

/** Multiplier for FitStackedHeadline / poster type density. */
export function typeScaleFactor(tokens: CanvasTokens): number {
  if (tokens.typeScale === "display") return 1.1;
  if (tokens.typeScale === "dense") return 0.88;
  return 1;
}

/** Content inset from Brand Kit density / padding tokens. */
export function contentPaddingPx(
  tokens: CanvasTokens,
  opts?: { portrait?: boolean; factor?: number },
): number {
  const portraitFactor = opts?.portrait ? 0.72 : 1;
  const extra = opts?.factor ?? 1;
  return Math.max(12, Math.round(tokens.paddingPx * portraitFactor * extra));
}

/** Letter-preview width baseline (8.5in × 48px/in from qr-card letter size). */
const WALLET_LETTER_PREVIEW_PX = 8.5 * 48;

function walletWidthRatio(previewWidthPx: number): number {
  return Math.min(1.15, Math.max(0.45, previewWidthPx / WALLET_LETTER_PREVIEW_PX));
}

/** QR / Action card title size from Brand Kit + preview width. */
export function walletTitleFontSizePx(
  tokens: CanvasTokens,
  previewWidthPx: number,
  opts?: { reference?: boolean },
): number {
  const base =
    tokens.titleFontSizePx * typeScaleFactor(tokens) * walletWidthRatio(previewWidthPx);
  const ref = opts?.reference ? 0.85 : 1;
  return Math.max(12, Math.round(base * ref));
}

/** QR / Action card body / description size. */
export function walletBodyFontSizePx(
  tokens: CanvasTokens,
  previewWidthPx: number,
): number {
  return Math.max(
    9,
    Math.round(
      tokens.subtitleFontSizePx * typeScaleFactor(tokens) * walletWidthRatio(previewWidthPx),
    ),
  );
}

/** Tagline, URL, local footer on wallet cards. Scales with preview width when given. */
export function walletMetaFontSizePx(
  tokens: CanvasTokens,
  previewWidthPx?: number,
): number {
  const widthFactor =
    previewWidthPx != null ? walletWidthRatio(previewWidthPx) : 1;
  return Math.max(
    9,
    Math.round(
      tokens.subtitleFontSizePx *
        0.78 *
        typeScaleFactor(tokens) *
        widthFactor,
    ),
  );
}

/** Inner padding for wallet cards by approximate size bucket. */
export function walletContentPaddingPx(
  tokens: CanvasTokens,
  previewWidthPx: number,
): number {
  const ratio = walletWidthRatio(previewWidthPx);
  const factor = ratio < 0.55 ? 0.38 : ratio < 0.7 ? 0.48 : ratio < 0.9 ? 0.58 : 0.68;
  return Math.max(8, contentPaddingPx(tokens, { factor }));
}

/** Gap between wallet chrome blocks. */
export function walletContentGapPx(
  tokens: CanvasTokens,
  previewWidthPx: number,
): number {
  const ratio = walletWidthRatio(previewWidthPx);
  return Math.max(4, Math.round(tokens.gapPx * Math.min(1, ratio + 0.15)));
}

/**
 * CSS `clamp()` rem/vmin string scaled by Brand Kit typeScale.
 * Used by board-banner / trim rails where absolute px sizes fight strip height.
 */
export function clampTypeRem(
  tokens: CanvasTokens | undefined,
  minRem: number,
  vmin: number,
  maxRem: number,
): string {
  const s = tokens ? typeScaleFactor(tokens) : 1;
  const f = (n: number) => (n * s).toFixed(3);
  return `clamp(${f(minRem)}rem, ${f(vmin)}vmin, ${f(maxRem)}rem)`;
}

/** Horizontal padding % for board-banner / trim content rows. */
export function bannerPadPercent(tokens: CanvasTokens | undefined): number {
  if (!tokens) return 4;
  if (tokens.density === "tight") return 3;
  if (tokens.density === "roomy") return 5;
  return 4;
}

/** Preview type scale for Document Generator OfficePresetMock (CSS silhouette). */
export interface OfficeMockTypography {
  headerTitlePx: number;
  docTitlePx: number;
  bodyPx: number;
  labelPx: number;
}

/**
 * Map Brand Kit canvas typeScale onto Office mock sizes.
 * Preview scale is ~0.6 of canvas title metrics so the paper silhouette stays readable.
 */
export function officeMockTypography(tokens: CanvasTokens): OfficeMockTypography {
  const scale =
    tokens.typeScale === "display" ? 0.62 : tokens.typeScale === "dense" ? 0.52 : 0.55;
  const title = Math.round(tokens.titleFontSizePx * scale);
  const sub = Math.max(10, Math.round(tokens.subtitleFontSizePx * 0.95));
  return {
    headerTitlePx: Math.max(12, Math.round(title * 0.55)),
    docTitlePx: Math.max(16, title),
    bodyPx: Math.max(12, Math.round(sub * 1.15)),
    labelPx: Math.max(10, Math.round(sub * 0.9)),
  };
}

/** Content padding for Document Generator OfficePresetMock body regions. */
export function officeMockPaddingPx(tokens: CanvasTokens | undefined): number {
  if (!tokens) return 16;
  const factor = tokens.density === "tight" ? 0.32 : tokens.density === "roomy" ? 0.48 : 0.4;
  return Math.max(12, Math.round(tokens.paddingPx * factor));
}
