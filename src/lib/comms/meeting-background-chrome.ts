/**
 * Meeting Background type / lockup metrics for HD design-px canvases.
 *
 * Canvas Core lays the sheet out at 1920×1080 (or 1080×1920). Browser `rem`
 * and Tailwind `text-xs` do not scale with that box — they stayed preview-sized
 * while the sheet grew, so exports lost the solidarity punch. Size from design
 * width instead; capture pixelRatio then scales HD → UHD evenly.
 *
 * Lead / closer stay under the digital meta cap (~22px) used by
 * `expectMetaSupport`. Headlines are display type and must not use that cap.
 */

export type MeetingHeadlineDensity = "panel" | "bar" | "corner" | "readable";

/** Share of design width for stacked headlines (Keep-Calm punch at HD). */
const HEADLINE_WIDTH_SHARE: Record<MeetingHeadlineDensity, number> = {
  corner: 0.052,
  bar: 0.046,
  panel: 0.038,
  readable: 0.036,
};

const HEADLINE_MIN_PX: Record<MeetingHeadlineDensity, number> = {
  corner: 40,
  bar: 36,
  panel: 28,
  readable: 32,
};

export function meetingHeadlinePx(
  designWidthPx: number,
  density: MeetingHeadlineDensity,
  typeScale = 1,
): number {
  const raw = Math.round(
    designWidthPx * HEADLINE_WIDTH_SHARE[density] * typeScale,
  );
  return Math.max(HEADLINE_MIN_PX[density], raw);
}

export function meetingHeadlineMinPx(
  designWidthPx: number,
  density: MeetingHeadlineDensity,
): number {
  return Math.max(18, Math.round(meetingHeadlinePx(designWidthPx, density) * 0.42));
}

/** Keep-Calm lead — supporting, not display. Capped for meta-support e2e. */
export function meetingLeadPx(designWidthPx: number): number {
  return Math.max(14, Math.min(20, Math.round(designWidthPx * 0.01)));
}

export function meetingCloserPx(designWidthPx: number): number {
  return Math.max(14, Math.min(20, Math.round(designWidthPx * 0.0105)));
}

export function meetingLocalLabelPx(designWidthPx: number): number {
  return Math.max(13, Math.min(18, Math.round(designWidthPx * 0.009)));
}

export function meetingFieldPadPx(
  designWidthPx: number,
  portrait: boolean,
): number {
  const share = portrait ? 0.04 : 0.032;
  return Math.max(24, Math.round(designWidthPx * share));
}

export function meetingBandPadPx(
  designWidthPx: number,
  portrait: boolean,
): number {
  const share = portrait ? 0.022 : 0.018;
  return Math.max(16, Math.round(designWidthPx * share));
}

export function meetingLogoWidthPx(
  designWidthPx: number,
  size: "sm" | "md",
): number {
  return Math.round(designWidthPx * (size === "md" ? 0.2 : 0.155));
}

export function meetingLogoMaxHeightPx(
  designHeightPx: number,
  size: "sm" | "md",
): number {
  return Math.round(designHeightPx * (size === "md" ? 0.13 : 0.1));
}
