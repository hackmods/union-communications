/**
 * Solidarity Poster supporting type for print design-px sheets.
 *
 * Headlines stay Brand Kit title × layout factor, then wrap-and-fit.
 * Lead / CTA / URL / local used Tailwind rem after Canvas Core densified
 * letter to 850px — 12px on the sheet is ~9pt on paper. These shares restore
 * readable board type without requiring Brand Kit type scale.
 *
 * Footer nodes stay tagged `data-canvas-meta` — keep them ≤ 22px so
 * `expectMetaSupport` still holds.
 */

export function solidaritySupportChrome(designWidthPx: number) {
  return {
    leadPx: Math.max(16, Math.min(22, Math.round(designWidthPx * 0.024))),
    ctaPx: Math.max(15, Math.min(22, Math.round(designWidthPx * 0.022))),
    urlPx: Math.max(14, Math.min(20, Math.round(designWidthPx * 0.02))),
    localPx: Math.max(14, Math.min(20, Math.round(designWidthPx * 0.019))),
    qrPx: Math.max(88, Math.round(designWidthPx * 0.125)),
    minHeadlinePx: Math.max(32, Math.round(designWidthPx * 0.044)),
    logoMaxHeightPx: Math.round(designWidthPx * 0.14),
  };
}
