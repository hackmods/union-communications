/**
 * Solidarity Poster supporting type for design-px sheets (print + digital).
 *
 * Headlines stay Brand Kit title × layout factor, then wrap-and-fit.
 * Lead / CTA / URL / local used Tailwind rem after Canvas Core densified
 * letter to 850px — 12px on the sheet is ~9pt on paper. These shares restore
 * readable board type; Brand Kit type scale is an optional multiplier.
 *
 * Footer nodes stay tagged `data-canvas-meta` — keep them ≤ 22px so
 * `expectMetaSupport` still holds.
 */

export type SolidaritySupportChromeOptions = {
  /** Brand Kit typeScaleFactor — display 1.1, compact 1, dense 0.88. */
  typeScale?: number;
  /**
   * Headline line count (after split). Display + multi-line Keep-Calm copy
   * compresses the logo so the type slot keeps vertical budget.
   */
  headlineLineCount?: number;
  /** Design height — caps logo share on landscape HD / ultrawide sheets. */
  designHeightPx?: number;
};

export type SolidaritySupportChrome = {
  leadPx: number;
  ctaPx: number;
  urlPx: number;
  localPx: number;
  qrPx: number;
  minHeadlinePx: number;
  logoMaxHeightPx: number;
};

/** Logo yields under Display; Dense frees a little more lockup room. */
function logoTypeScaleMultiplier(typeScale: number): number {
  if (typeScale >= 1.08) return 0.85;
  if (typeScale <= 0.92) return 1.08;
  return 1;
}

export function solidaritySupportChrome(
  designWidthPx: number,
  opts: SolidaritySupportChromeOptions = {},
): SolidaritySupportChrome {
  const typeScale =
    typeof opts.typeScale === "number" && Number.isFinite(opts.typeScale)
      ? Math.min(1.2, Math.max(0.8, opts.typeScale))
      : 1;
  const lines = Math.max(1, Math.round(opts.headlineLineCount ?? 1));
  const linePressure = lines >= 3 ? 0.88 : lines >= 2 ? 0.94 : 1;
  const logoScale = logoTypeScaleMultiplier(typeScale) * linePressure;

  const widthShareLogo = designWidthPx * 0.14;
  const heightShareLogo =
    opts.designHeightPx != null && opts.designHeightPx > 0
      ? opts.designHeightPx * 0.12
      : widthShareLogo;
  const landscape =
    opts.designHeightPx != null &&
    opts.designHeightPx > 0 &&
    opts.designHeightPx < designWidthPx;

  // Lead tracks type scale; stay under the meta-support cap on print.
  // Digital HD sheets use the same cap so lead never fights Keep-Calm titles.
  const leadCap = 22;
  const leadBase = Math.round(designWidthPx * 0.024 * typeScale);
  const ctaBase = Math.round(designWidthPx * 0.022 * Math.min(typeScale, 1.05));
  const urlBase = Math.round(designWidthPx * 0.02);
  const localBase = Math.round(designWidthPx * 0.019);

  // QR: ~12.5% of width on portrait/print; cap by height on landscape HD so
  // the footer strip does not dominate the Keep-Calm stack.
  const qrFromWidth = Math.round(designWidthPx * (landscape ? 0.07 : 0.125));
  const qrFromHeight =
    opts.designHeightPx != null && opts.designHeightPx > 0
      ? Math.round(opts.designHeightPx * (landscape ? 0.16 : 0.12))
      : qrFromWidth;

  return {
    leadPx: Math.max(16, Math.min(leadCap, leadBase)),
    ctaPx: Math.max(15, Math.min(22, ctaBase)),
    urlPx: Math.max(14, Math.min(20, urlBase)),
    localPx: Math.max(14, Math.min(20, localBase)),
    qrPx: Math.max(72, Math.min(qrFromWidth, qrFromHeight)),
    minHeadlinePx: Math.max(
      landscape ? 28 : 32,
      Math.round(designWidthPx * (landscape ? 0.032 : 0.044)),
    ),
    logoMaxHeightPx: Math.max(
      48,
      Math.round(Math.min(widthShareLogo, heightShareLogo) * logoScale),
    ),
  };
}
