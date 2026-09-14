/**
 * Quote Card local lockup. The quote and author scale with the 1080 / 1920
 * sheet; the local name must not stay on the print `expectMetaSupport` 23px
 * cap — that is for date/time rows, not social identity.
 */
export function quoteIdentityChrome(
  designWidthPx: number,
  designHeightPx: number,
) {
  const short = Math.min(designWidthPx, designHeightPx);
  return {
    logoMaxHeightPx: Math.round(short * 0.165),
    localPx: Math.min(34, Math.max(20, Math.round(designWidthPx * 0.028))),
  };
}
