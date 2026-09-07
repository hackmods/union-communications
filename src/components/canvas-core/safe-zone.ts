import type { EdgeClearanceProfile, EdgeInsets } from "@/lib/utils/edge-clearance";
import {
  insetsForProfile,
  SOCIAL_SAFE_ZONE_INSETS,
  ZERO_INSETS,
} from "@/lib/utils/edge-clearance";
import type { SafeZoneProfile } from "./types";

/**
 * Shared safe-zone / bleed scale for Canvas Core.
 * Fractions are of design width (sides) or height (top/bottom) — same as edge-clearance.
 */

export function safeZoneInsets(
  profile: SafeZoneProfile,
  enabled = true,
): EdgeInsets {
  if (!enabled || profile === "none") return ZERO_INSETS;
  if (profile === "social") return SOCIAL_SAFE_ZONE_INSETS;
  return insetsForProfile(profile as EdgeClearanceProfile, true);
}

/** Default content padding as a share of design width (~10–12%). */
export const CONTENT_PAD_CQW = 10;

/** Default gap between stack rows as a share of design width. */
export const CONTENT_GAP_CQW = 3.5;

/** Print bleed allowance as a share of design width (outside trim). */
export const PRINT_BLEED_CQW = 1.5;

export function contentPadCqw(density: "tight" | "default" | "roomy" = "default"): number {
  if (density === "tight") return 7;
  if (density === "roomy") return 13;
  return CONTENT_PAD_CQW;
}
