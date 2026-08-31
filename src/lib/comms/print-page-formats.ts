/** Shared fixed-width preview math for letter / tabloid print canvases. */

/** ~36 px/in keeps letter previews readable in the form column without overflow. */
export const PRINT_PAGE_PX_PER_INCH = 36;

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

/** Target ~300dpi letter width for PNG/PDF export from the fixed design canvas. */
export function printPageExportPixelRatio(
  format: Pick<PrintPagePreviewSpec, "previewWidthPx" | "widthInches">,
  targetWidthPx = 2550,
): number {
  return Math.max(2, Math.min(4, targetWidthPx / format.previewWidthPx));
}
