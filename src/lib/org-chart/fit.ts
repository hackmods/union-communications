/** Letter design width — card chrome is authored at this size, not 306. */
export const ORG_CHART_LETTER_WIDTH_PX = 850;

/**
 * Poster load: each band heading costs vertical space like an extra person.
 * List layouts are row-cheap, so count people only.
 */
export function orgChartContentLoad(input: {
  namedCount: number;
  bandCount: number;
  listLayout: boolean;
}): number {
  if (input.listLayout) return input.namedCount;
  return input.namedCount + input.bandCount;
}

/**
 * Card / type multiplier for the current page + roster.
 * Replaces `designWidth / 306`, which made letter cards ~2.8× too large
 * after Canvas Core densified print sheets.
 */
export function orgChartChromeScale(input: {
  designWidthPx: number;
  namedCount: number;
  bandCount: number;
  listLayout: boolean;
}): number {
  const page = input.designWidthPx / ORG_CHART_LETTER_WIDTH_PX;
  const load = orgChartContentLoad(input);
  let comfort = 1.55;
  if (load > 6) comfort = 1.28;
  if (load > 10) comfort = 1.08;
  if (load > 16) comfort = 0.92;
  if (load > 24) comfort = 0.78;
  return Math.max(0.7, Math.min(1.8, page * comfort));
}

export function orgChartUsesCompactChrome(load: number): boolean {
  return load > 8;
}

/** Shrink the header lockup so extra bands keep a type budget. */
export function orgChartHeaderLogoScale(load: number): number {
  if (load > 14) return 0.58;
  if (load > 10) return 0.68;
  if (load > 6) return 0.82;
  return 1;
}
