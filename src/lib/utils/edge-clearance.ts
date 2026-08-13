/**
 * Extra edge clearance for wallpapers and meeting backgrounds.
 *
 * Colour / grain stay full-bleed. Type and chrome inset so OS Fill, taskbars,
 * notches, and Zoom/Teams cover-fit crop empty brand field instead of slogans.
 *
 * CSS `padding` percentages are width-relative, so insets are applied as
 * absolute `top`/`right`/`bottom`/`left` (top/bottom vs height, sides vs width).
 */

export type EdgeClearanceProfile =
  | "desktop"
  | "ultrawide"
  | "phone"
  | "meeting"
  | "print";

export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const ZERO_INSETS: EdgeInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/** Resizer preview overlay — uniform 10% social crop guide, not a baked inset. */
export const SOCIAL_SAFE_ZONE_INSETS: EdgeInsets = uniformInsets(0.1);

const PROFILES: Record<EdgeClearanceProfile, EdgeInsets> = {
  /** Desktop 16:9 wallpaper — taskbar + Fill-mode crop. */
  desktop: { top: 0.04, right: 0.04, bottom: 0.1, left: 0.04 },
  /** 19.5:9 wallpaper on 16:9 monitors crops the sides hard. */
  ultrawide: { top: 0.04, right: 0.12, bottom: 0.1, left: 0.12 },
  /** Phone wallpaper / portrait meeting — notch/status + home indicator. */
  phone: { top: 0.12, right: 0.04, bottom: 0.1, left: 0.04 },
  /** Landscape Zoom/Teams — cover-fit + UI chrome; extra bottom for taskbar reuse. */
  meeting: { top: 0.08, right: 0.08, bottom: 0.1, left: 0.08 },
  /** Print poster when the steward opts in — printer/frame clip only. */
  print: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
};

export function uniformInsets(fraction: number): EdgeInsets {
  return { top: fraction, right: fraction, bottom: fraction, left: fraction };
}

export function insetsForProfile(
  profile: EdgeClearanceProfile,
  enabled = true,
): EdgeInsets {
  if (!enabled) return ZERO_INSETS;
  return PROFILES[profile];
}

export function isZeroInsets(insets: EdgeInsets): boolean {
  return (
    insets.top === 0 &&
    insets.right === 0 &&
    insets.bottom === 0 &&
    insets.left === 0
  );
}

function pct(n: number): string {
  return `${n * 100}%`;
}

/** Absolute box from parent edges — use on inner layout frame and overlay. */
export function insetsToInsetStyle(insets: EdgeInsets): {
  top: string;
  right: string;
  bottom: string;
  left: string;
} {
  return {
    top: pct(insets.top),
    right: pct(insets.right),
    bottom: pct(insets.bottom),
    left: pct(insets.left),
  };
}

/** Solidarity Poster format id → clearance profile. */
export function profileForSolidarityFormat(
  formatId: string,
): EdgeClearanceProfile {
  if (formatId === "horizontal") return "desktop";
  if (formatId === "wide") return "ultrawide";
  if (formatId === "vertical") return "phone";
  return "print";
}

/** Meeting Background orientation → clearance profile. */
export function profileForMeetingOrientation(
  orientation: "landscape" | "portrait",
): EdgeClearanceProfile {
  return orientation === "portrait" ? "phone" : "meeting";
}

/** Digital wallpapers default on; print board fillers stay flush unless opted in. */
export function defaultEdgeClearanceForMedium(
  medium: "print" | "digital",
): boolean {
  return medium === "digital";
}
