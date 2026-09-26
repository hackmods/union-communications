import type { CSSProperties } from "react";
import type { DesignTreatment } from "@/types/entities";
import { pickContrastingInk } from "@/lib/utils/ink";

/** Canonical chrome widths so makers do not invent their own px values. */
export const TREATMENT_CHROME = {
  /** Flyer / board notice / solidarity top band */
  printTop: { balanced: 24, paper: 8 },
  /** Meeting background top band */
  meetingTop: { balanced: 22, paper: 7 },
  /** Action card / QR card frame */
  wallet: { balancedFrame: 8, paperTop: 4 },
  /** Pulse poll sheet frame */
  pulse: { balancedFrame: 10, paperFrame: 3 },
  /** Graphic / quote inset reading area */
  graphicInsetPercent: 4,
  /**
   * QR Board balanced frame as a fraction of design width
   * (scales with poster format; not a fixed px chrome).
   */
  qrBoardBalancedRatio: 0.025,
} as const;

export type TreatmentPalette = {
  primary: string;
  secondary: string;
  accent: string;
};

export type TreatmentSurface = {
  treatment: DesignTreatment;
  /** Outer canvas / export background (brand for balanced frame/inset; white for paper/sheet). */
  outerFill: string;
  /** Reading/writing surface. */
  contentFill: string;
  /** Remapped colours for child layout components that paint on `primary`. */
  primary: string;
  secondary: string;
  accent: string;
  /** Brand primary unchanged — for borders and CTAs. */
  brand: string;
  textInk: string;
  isLightContent: boolean;
};

/**
 * Shared Full / Balanced / Mostly white colour remap for public Comms canvases.
 * `mode`:
 * - `sheet` — wallet/action/board: non-full sheets sit on white
 * - `field` — graphic/quote: child layouts see white primary; balanced may frame outside
 * - `print` — flyer-like: white field + brand top band (caller applies band style)
 */
export function resolveTreatmentSurface(
  treatment: DesignTreatment,
  palette: TreatmentPalette,
  mode: "sheet" | "field" | "print" = "sheet",
): TreatmentSurface {
  const brand = palette.primary;
  if (treatment === "full") {
    return {
      treatment,
      outerFill: palette.primary,
      contentFill: palette.primary,
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      brand,
      textInk: pickContrastingInk(palette.primary),
      isLightContent: false,
    };
  }

  const textInk = "#1A1A1A";
  if (mode === "field") {
    return {
      treatment,
      outerFill: treatment === "balanced" ? brand : "#FFFFFF",
      contentFill: "#FFFFFF",
      primary: "#FFFFFF",
      secondary: "#FFFFFF",
      accent: brand,
      brand,
      textInk,
      isLightContent: true,
    };
  }

  // sheet + print share white content; secondary becomes brand on balanced for side accents
  return {
    treatment,
    outerFill: "#FFFFFF",
    contentFill: "#FFFFFF",
    primary: "#FFFFFF",
    secondary: treatment === "balanced" ? brand : palette.secondary,
    accent: brand,
    brand,
    textInk,
    isLightContent: true,
  };
}

export function treatmentTopBandStyle(
  treatment: DesignTreatment,
  brandPrimary: string,
  widths: { balanced: number; paper: number } = TREATMENT_CHROME.printTop,
): CSSProperties | undefined {
  if (treatment === "full") return undefined;
  const width = treatment === "balanced" ? widths.balanced : widths.paper;
  return {
    borderTop: `${width}px solid ${brandPrimary}`,
    boxSizing: "border-box",
  };
}

export function treatmentWalletFrameStyle(
  treatment: DesignTreatment,
  brandPrimary: string,
  widths: {
    balancedFrame: number;
    paperTop: number;
  } = TREATMENT_CHROME.wallet,
): CSSProperties {
  if (treatment === "balanced") {
    return {
      border: `${widths.balancedFrame}px solid ${brandPrimary}`,
      boxSizing: "border-box",
    };
  }
  if (treatment === "paper") {
    return {
      borderTop: `${widths.paperTop}px solid ${brandPrimary}`,
      boxSizing: "border-box",
    };
  }
  return {};
}

export function treatmentPulseFrameStyle(
  treatment: DesignTreatment,
  brandPrimary: string,
  widths: {
    balancedFrame: number;
    paperFrame: number;
  } = TREATMENT_CHROME.pulse,
): CSSProperties {
  if (treatment === "full") return {};
  const width =
    treatment === "balanced" ? widths.balancedFrame : widths.paperFrame;
  return {
    backgroundColor: "#FFFFFF",
    backgroundImage: "none",
    border: `${width}px solid ${brandPrimary}`,
    boxSizing: "border-box",
  };
}

export function treatmentGraphicInsetClass(
  treatment: DesignTreatment,
): string {
  return treatment === "balanced"
    ? "absolute inset-[4%] overflow-hidden"
    : "relative h-full w-full overflow-hidden";
}

export function treatmentGraphicOuterStyle(
  treatment: DesignTreatment,
  brandPrimary: string,
  base: CSSProperties,
): CSSProperties {
  if (treatment !== "balanced") return base;
  return {
    ...base,
    backgroundColor: brandPrimary,
    backgroundImage: "none",
  };
}

/** Format-scaled balanced frame for QR Board posters. */
export function treatmentQrBoardFrameStyle(
  treatment: DesignTreatment,
  brandPrimary: string,
  designWidth: number,
  ratio: number = TREATMENT_CHROME.qrBoardBalancedRatio,
): CSSProperties {
  if (treatment !== "balanced") return {};
  const width = Math.max(1, Math.round(designWidth * ratio));
  return {
    border: `${width}px solid ${brandPrimary}`,
    boxSizing: "border-box",
  };
}
