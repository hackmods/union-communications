/**
 * Shared aspect / paper registry for Canvas Core.
 * Engines may reference sizes before any tool UI surfaces them.
 */

import type { CanvasAspectId } from "@/components/canvas-core/types";
import { printPagePreviewWidthPx } from "@/lib/comms/print-page-formats";

export interface CanvasAspectSpec {
  id: CanvasAspectId;
  /** CSS aspect-ratio string, e.g. `"8.5 / 11"`. */
  aspectRatio: string;
  /** Tailwind aspect utility when one exists. */
  aspectClass?: string;
  widthInches?: number;
  heightInches?: number;
  /** Design / preview width when the aspect is used as a fixed canvas. */
  designWidthPx: number;
  medium: "print" | "digital";
  labelKey: string;
}

/** mm → inches */
function mmToIn(mm: number): number {
  return mm / 25.4;
}

export const CANVAS_ASPECTS: Record<CanvasAspectId, CanvasAspectSpec> = {
  letter: {
    id: "letter",
    aspectRatio: "8.5 / 11",
    aspectClass: "aspect-[8.5/11]",
    widthInches: 8.5,
    heightInches: 11,
    designWidthPx: printPagePreviewWidthPx(8.5),
    medium: "print",
    labelKey: "formats.letter",
  },
  halfLetter: {
    id: "halfLetter",
    aspectRatio: "5.5 / 8.5",
    aspectClass: "aspect-[5.5/8.5]",
    widthInches: 5.5,
    heightInches: 8.5,
    designWidthPx: printPagePreviewWidthPx(5.5),
    medium: "print",
    labelKey: "formats.halfLetter",
  },
  tabloid: {
    id: "tabloid",
    aspectRatio: "11 / 17",
    aspectClass: "aspect-[11/17]",
    widthInches: 11,
    heightInches: 17,
    designWidthPx: printPagePreviewWidthPx(11),
    medium: "print",
    labelKey: "formats.tabloid",
  },
  a4: {
    id: "a4",
    aspectRatio: `${mmToIn(210).toFixed(4)} / ${mmToIn(297).toFixed(4)}`,
    aspectClass: "aspect-[210/297]",
    widthInches: mmToIn(210),
    heightInches: mmToIn(297),
    designWidthPx: printPagePreviewWidthPx(mmToIn(210)),
    medium: "print",
    labelKey: "formats.a4",
  },
  "1:1": {
    id: "1:1",
    aspectRatio: "1 / 1",
    aspectClass: "aspect-square",
    designWidthPx: 1080,
    medium: "digital",
    labelKey: "formats.square",
  },
  "4:5": {
    id: "4:5",
    aspectRatio: "4 / 5",
    aspectClass: "aspect-[4/5]",
    designWidthPx: 1080,
    medium: "digital",
    labelKey: "formats.portrait45",
  },
  "16:9": {
    id: "16:9",
    aspectRatio: "16 / 9",
    aspectClass: "aspect-[16/9]",
    designWidthPx: 1920,
    medium: "digital",
    labelKey: "formats.widescreen",
  },
  "9:16": {
    id: "9:16",
    aspectRatio: "9 / 16",
    aspectClass: "aspect-[9/16]",
    designWidthPx: 1080,
    medium: "digital",
    labelKey: "formats.story",
  },
  "1200:630": {
    id: "1200:630",
    aspectRatio: "1200 / 630",
    aspectClass: "aspect-[1200/630]",
    designWidthPx: 1200,
    medium: "digital",
    labelKey: "formats.linkPreview",
  },
  "19.5:9": {
    id: "19.5:9",
    aspectRatio: "19.5 / 9",
    aspectClass: "aspect-[19.5/9]",
    designWidthPx: 2340,
    medium: "digital",
    labelKey: "formats.ultrawide",
  },
};

export const CANVAS_ASPECT_ORDER: readonly CanvasAspectId[] = [
  "letter",
  "halfLetter",
  "tabloid",
  "a4",
  "1:1",
  "4:5",
  "16:9",
  "9:16",
  "1200:630",
  "19.5:9",
];

export function canvasAspectDesignHeight(spec: CanvasAspectSpec): number {
  if (spec.widthInches && spec.heightInches) {
    return Math.round(
      spec.designWidthPx * (spec.heightInches / spec.widthInches),
    );
  }
  const [w, h] = spec.aspectRatio.split("/").map((p) => Number.parseFloat(p));
  if (!(w > 0) || !(h > 0)) return spec.designWidthPx;
  return Math.round(spec.designWidthPx * (h / w));
}

/** Graphic Maker / Quote Card aspect → Canvas Core digital specs. */
export function exampleAspectSpec(
  aspect: "landscape" | "square" | "portrait",
): CanvasAspectSpec {
  if (aspect === "portrait") return CANVAS_ASPECTS["9:16"];
  if (aspect === "landscape") return CANVAS_ASPECTS["16:9"];
  return CANVAS_ASPECTS["1:1"];
}

export function exampleAspectDesignSize(
  aspect: "landscape" | "square" | "portrait",
): { width: number; height: number } {
  const spec = exampleAspectSpec(aspect);
  return {
    width: spec.designWidthPx,
    height: canvasAspectDesignHeight(spec),
  };
}
