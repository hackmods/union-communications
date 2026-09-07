/** Print paper sizes for Flyer Maker (preview aspect + PDF inches). */

import {
  printPageExportPixelRatio,
  printPagePreviewHeightPx,
  printPagePreviewWidthPx,
  type PrintPagePreviewSpec,
} from "@/lib/comms/print-page-formats";
import { CANVAS_ASPECTS } from "@/lib/comms/canvas-aspects";

export type FlyerFormatId = "letter" | "halfLetter" | "tabloid" | "a4";

export const FLYER_FORMAT_ORDER: readonly FlyerFormatId[] = [
  "letter",
  "halfLetter",
  "tabloid",
  "a4",
] as const;

export const DEFAULT_FLYER_FORMAT: FlyerFormatId = "letter";

export interface FlyerFormat extends PrintPagePreviewSpec {
  id: FlyerFormatId;
  /** Tailwind aspect utility class for the preview canvas */
  aspectClass: string;
  /**
   * Inline CSS aspect-ratio (capture-safe). Prefer this over relying solely
   * on the Tailwind class when html-to-image clones the node.
   */
  aspectRatio: string;
}

const a4 = CANVAS_ASPECTS.a4;

export const FLYER_FORMATS: Record<FlyerFormatId, FlyerFormat> = {
  letter: {
    id: "letter",
    aspectClass: "aspect-[8.5/11]",
    aspectRatio: "8.5 / 11",
    widthInches: 8.5,
    heightInches: 11,
    previewWidthPx: printPagePreviewWidthPx(8.5),
  },
  halfLetter: {
    id: "halfLetter",
    aspectClass: "aspect-[5.5/8.5]",
    aspectRatio: "5.5 / 8.5",
    widthInches: 5.5,
    heightInches: 8.5,
    previewWidthPx: printPagePreviewWidthPx(5.5),
  },
  tabloid: {
    id: "tabloid",
    aspectClass: "aspect-[11/17]",
    aspectRatio: "11 / 17",
    widthInches: 11,
    heightInches: 17,
    previewWidthPx: printPagePreviewWidthPx(11),
  },
  a4: {
    id: "a4",
    aspectClass: a4.aspectClass ?? "aspect-[210/297]",
    aspectRatio: a4.aspectRatio,
    widthInches: a4.widthInches!,
    heightInches: a4.heightInches!,
    previewWidthPx: a4.designWidthPx,
  },
};

export const flyerPreviewHeightPx = printPagePreviewHeightPx;

export const flyerExportPixelRatio = printPageExportPixelRatio;

export function isFlyerFormatId(value: unknown): value is FlyerFormatId {
  return (
    value === "letter" ||
    value === "halfLetter" ||
    value === "tabloid" ||
    value === "a4"
  );
}
