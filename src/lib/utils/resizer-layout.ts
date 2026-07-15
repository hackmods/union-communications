import type { LogoShape } from "@/components/brand/LocalLogoPlate";

/** 3×3 logo / image anchor inside the crop frame. */
export type ResizerPlacement =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const RESIZER_PLACEMENTS: readonly ResizerPlacement[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

/** LocalLogoPlate fluid rectangle aspect (matches component shell). */
export const LOGO_RECT_ASPECT = 28 / 11;

export interface ContainBoxPct {
  widthPct: number;
  heightPct: number;
}

/**
 * Logo plate size as % of the full frame when fitting with padding.
 * Square/circle use the shorter inner side; rectangle keeps 28:11.
 */
export function logoContainBoxPct(
  frameWidth: number,
  frameHeight: number,
  shape: LogoShape,
  padFraction = 0.08,
): ContainBoxPct {
  const fw = Math.max(1, frameWidth);
  const fh = Math.max(1, frameHeight);
  const pad = Math.min(0.4, Math.max(0, padFraction));
  const innerW = fw * (1 - 2 * pad);
  const innerH = fh * (1 - 2 * pad);

  if (shape === "rectangle") {
    let w = innerW;
    let h = w / LOGO_RECT_ASPECT;
    if (h > innerH) {
      h = innerH;
      w = h * LOGO_RECT_ASPECT;
    }
    return {
      widthPct: (w / fw) * 100,
      heightPct: (h / fh) * 100,
    };
  }

  const side = Math.min(innerW, innerH);
  return {
    widthPct: (side / fw) * 100,
    heightPct: (side / fh) * 100,
  };
}

export interface PlacementBoxPct extends ContainBoxPct {
  leftPct: number;
  topPct: number;
}

/** Absolute % box for a contained logo at a placement (respects padding). */
export function logoContainPlacementBox(
  frameWidth: number,
  frameHeight: number,
  shape: LogoShape,
  placement: ResizerPlacement,
  padFraction = 0.08,
): PlacementBoxPct {
  const box = logoContainBoxPct(frameWidth, frameHeight, shape, padFraction);
  const padPct = padFraction * 100;
  const minLeft = padPct;
  const minTop = padPct;
  const maxLeft = 100 - padPct - box.widthPct;
  const maxTop = 100 - padPct - box.heightPct;
  const midLeft = (100 - box.widthPct) / 2;
  const midTop = (100 - box.heightPct) / 2;

  const col = placement.endsWith("left")
    ? "left"
    : placement.endsWith("right")
      ? "right"
      : "center";
  const row = placement.startsWith("top")
    ? "top"
    : placement.startsWith("bottom")
      ? "bottom"
      : "middle";

  const leftPct =
    col === "left" ? minLeft : col === "right" ? maxLeft : midLeft;
  const topPct = row === "top" ? minTop : row === "bottom" ? maxTop : midTop;

  return { ...box, leftPct, topPct };
}

/** CSS `object-position` for upload contain/cover. */
export function placementToObjectPosition(placement: ResizerPlacement): string {
  const col = placement.endsWith("left")
    ? "left"
    : placement.endsWith("right")
      ? "right"
      : "center";
  const row = placement.startsWith("top")
    ? "top"
    : placement.startsWith("bottom")
      ? "bottom"
      : "center";
  return `${col} ${row}`;
}

/** Flex align classes for cover-mode logo crop (oversized child). */
export function placementToFlexClass(placement: ResizerPlacement): string {
  const col = placement.endsWith("left")
    ? "justify-start"
    : placement.endsWith("right")
      ? "justify-end"
      : "justify-center";
  const row = placement.startsWith("top")
    ? "items-start"
    : placement.startsWith("bottom")
      ? "items-end"
      : "items-center";
  return `${col} ${row}`;
}
