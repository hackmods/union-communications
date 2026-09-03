import {
  CHECKLIST_MARK_TITLE_GAP,
  WORKSHEET_MARK_TITLE_GAP,
} from "./constants";
import type { JsPdfLike } from "./types";

/** Minimal logo bytes for mark placement — matches PdfImageBytes / BrandLogoBytes shape. */
export type GuideMarkImage = {
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
  src: string;
};

export type GuideMarkProfile = "worksheet" | "checklist";

export type GuideMarkPlacement = {
  draw: boolean;
  x: number;
  y: number;
  widthPt: number;
  heightPt: number;
};

export function guidePdfMarkPlacementPt(
  logo: GuideMarkImage | null | undefined,
  opts?: { maxW?: number; maxH?: number; x?: number; y?: number },
): GuideMarkPlacement | null {
  if (!logo?.bytes?.length) return null;
  const maxW = opts?.maxW ?? 72;
  const maxH = opts?.maxH ?? 36;
  const aspect =
    logo.widthPx > 0 && logo.heightPx > 0
      ? logo.widthPx / logo.heightPx
      : 2.4;
  let widthPt = maxW;
  let heightPt = widthPt / aspect;
  if (heightPt > maxH) {
    heightPt = maxH;
    widthPt = heightPt * aspect;
  }
  return {
    draw: true,
    x: opts?.x ?? 48,
    y: opts?.y ?? 36,
    widthPt,
    heightPt,
  };
}

export function guidePdfWorksheetMarkPlacementPt(
  logo: GuideMarkImage | null | undefined,
  margin: number,
): GuideMarkPlacement | null {
  return guidePdfMarkPlacementPt(logo, {
    maxW: 52,
    maxH: 26,
    x: margin,
    y: 24,
  });
}

export function resolveGuideMarkPlacement(
  logo: GuideMarkImage | null | undefined,
  profile: GuideMarkProfile,
  margin: number,
): GuideMarkPlacement | null {
  if (profile === "worksheet") {
    return guidePdfWorksheetMarkPlacementPt(logo, margin);
  }
  return guidePdfMarkPlacementPt(logo);
}

export function resolveHeaderStartYAfterMark(
  placement: Pick<GuideMarkPlacement, "y" | "heightPt"> | null,
  profile: GuideMarkProfile,
  fallbackStartY: number,
): number {
  if (!placement) return fallbackStartY;
  const gap =
    profile === "worksheet" ? WORKSHEET_MARK_TITLE_GAP : CHECKLIST_MARK_TITLE_GAP;
  return placement.y + placement.heightPt + gap;
}

export type DrawGuidePlatformMarkResult = {
  startY: number;
  drewMark: boolean;
  placement: GuideMarkPlacement | null;
};

/**
 * Draw the UnionOps platform mark and return the canonical title baseline start Y.
 * All text-PDF families (worksheet, checklist, notes) must use this — never hardcode +5/+14.
 */
export function drawGuidePlatformMark(
  pdf: JsPdfLike,
  logo: GuideMarkImage | null | undefined,
  profile: GuideMarkProfile,
  margin: number,
  logoDataUrl: string,
): DrawGuidePlatformMarkResult {
  const placement = resolveGuideMarkPlacement(logo, profile, margin);
  const fallbackStartY = profile === "worksheet" ? margin : margin;

  if (!placement || !logo?.bytes?.length) {
    return {
      startY: profile === "worksheet" ? margin : fallbackStartY,
      drewMark: false,
      placement: null,
    };
  }

  try {
    pdf.addImage(
      logoDataUrl,
      "PNG",
      placement.x,
      placement.y,
      placement.widthPt,
      placement.heightPt,
    );
    return {
      startY: resolveHeaderStartYAfterMark(placement, profile, fallbackStartY),
      drewMark: true,
      placement,
    };
  } catch {
    return {
      startY: profile === "worksheet" ? 24 : fallbackStartY,
      drewMark: false,
      placement,
    };
  }
}
