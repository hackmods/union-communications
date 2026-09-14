/** Shared fixed-width preview math for letter / tabloid print canvases. */

/**
 * Design px per physical inch on the authoring canvas.
 * 100 → letter = 850px; with targetWidthPx 1700 → pixelRatio 2 → ~200 PPI export
 * (was 36 → 306px × clamp-4 = 1224px ≈ 144 PPI — CANVAS-005).
 * ~300 PPI (2550px) OOMs html-to-image in Chromium on letter sheets; 200 PPI is
 * the practical browser ceiling while still denser than the old 144 PPI path.
 * Preview column fit is handled by CanvasWrapper maxScale, not by shrinking design px.
 */
export const PRINT_PAGE_PX_PER_INCH = 100;

/** Pre-Canvas-Core letter width — keep as type-token reference so fonts scale with design. */
export const PRINT_PAGE_LEGACY_REFERENCE_PX = 306;

/** Target raster width for letter (~200 DPI × 8.5"). */
export const PRINT_PAGE_TARGET_WIDTH_PX = 1700;

export interface PrintPagePreviewSpec {
  previewWidthPx: number;
  widthInches: number;
  heightInches: number;
}

export function printPagePreviewWidthPx(widthInches: number): number {
  return Math.round(widthInches * PRINT_PAGE_PX_PER_INCH);
}

export function printPagePreviewHeightPx(
  format: Pick<PrintPagePreviewSpec, "previewWidthPx" | "widthInches" | "heightInches">,
): number {
  return Math.round(
    format.previewWidthPx * (format.heightInches / format.widthInches),
  );
}

/**
 * Export pixel ratio from design width → target print raster.
 * Clamp raised to 6 so denser design canvases still reach PRINT_PAGE_TARGET_WIDTH_PX.
 */
export function printPageExportPixelRatio(
  format: Pick<PrintPagePreviewSpec, "previewWidthPx" | "widthInches">,
  targetWidthPx = PRINT_PAGE_TARGET_WIDTH_PX,
): number {
  return Math.max(2, Math.min(6, targetWidthPx / format.previewWidthPx));
}
