import type { CSSProperties } from "react";

/**
 * Apply `maxHeightPx` on the logo image, not the slot.
 * Slot `maxHeight` + `w-full` + `overflow-hidden` crops 2:1 faculty lockups.
 */
export function canvasLogoImageFitStyle(maxHeightPx: number): CSSProperties {
  return {
    maxHeight: maxHeightPx,
    maxWidth: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
  };
}
