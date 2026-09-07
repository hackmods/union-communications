/**
 * Shared contracts for the Canvas Core geometry engine.
 * Spec: docs/modules/CANVAS_CORE.md
 */

export type CanvasMode = "fixed" | "intrinsic";

export type CanvasAspectId =
  | "letter"
  | "halfLetter"
  | "tabloid"
  | "a4"
  | "1:1"
  | "4:5"
  | "16:9"
  | "9:16"
  | "1200:630"
  | "19.5:9";

export type SafeZoneProfile =
  | "print"
  | "desktop"
  | "ultrawide"
  | "phone"
  | "meeting"
  | "social"
  | "none";

export interface CanvasConfig {
  aspect: CanvasAspectId;
  /** Drives container-type: size (fixed) vs inline-size (intrinsic). */
  mode: CanvasMode;
  /** Authoring basis that cq units resolve against. */
  designWidthPx: number;
  /** Required when mode === "fixed". */
  designHeightPx?: number;
  medium: "print" | "digital";
  safeZone: SafeZoneProfile;
  /** Print bleed as a fraction of design width (cqw). */
  bleedCqw?: number;
}

export interface AssetBounds {
  maxWidthCqw: number;
  /** Unavailable when CanvasConfig.mode === "intrinsic". */
  maxHeightCqh?: number;
  /** Prefer resolving per logo variant (wide lockup ≠ mark). */
  aspectRatio?: number;
  align: "start" | "center" | "end";
}

export type CanvasExportFormat = "png" | "pdf" | "svg" | "zip";

/**
 * Extends capture CaptureOptions with format + preferred target width.
 * Prefer targetWidthPx over hand-tuned pixel ratios.
 */
export interface CanvasExportOptions {
  format: CanvasExportFormat;
  pixelRatio?: number;
  targetWidthPx?: number;
  backgroundColor?: string | null;
  /** PDF page size in inches (print family). */
  widthInches?: number;
  heightInches?: number;
  filename: string;
}

/** Default logo slot: never fill the full content width again (audit 81%). */
export const DEFAULT_LOGO_BOUNDS: AssetBounds = {
  maxWidthCqw: 42,
  maxHeightCqh: 18,
  align: "start",
};

export const WIDE_LOCKUP_BOUNDS: AssetBounds = {
  maxWidthCqw: 55,
  maxHeightCqh: 14,
  aspectRatio: 4.4,
  align: "start",
};

export const MARK_BOUNDS: AssetBounds = {
  maxWidthCqw: 18,
  maxHeightCqh: 18,
  aspectRatio: 1,
  align: "start",
};
