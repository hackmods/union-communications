"use client";

import { useCallback, type RefObject } from "react";
import { useExportHandler } from "@/hooks/use-export-handler";
import {
  downloadZip,
  exportNodeAsPng,
  exportNodeAsSvg,
  exportNodeAsBlob,
} from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import type { CanvasExportOptions } from "./types";

/**
 * Resolve pixelRatio from an optional target width (preferred) or an explicit ratio.
 * Clamped 2–6 so denser design canvases can still hit print targets
 * (~200 PPI letter / 1700px — higher OOMs html-to-image in-browser).
 */
export function resolveExportPixelRatio(
  designWidthPx: number,
  targetWidthPx?: number,
  explicit?: number,
): number {
  if (explicit != null && Number.isFinite(explicit)) {
    return Math.max(1, Math.min(6, explicit));
  }
  if (targetWidthPx != null && designWidthPx > 0) {
    return Math.max(2, Math.min(6, targetWidthPx / designWidthPx));
  }
  return 2;
}

/**
 * Raster-lane export helper for canvas tools.
 * Does not merge text-PDF or Office lanes (export-engine-parity).
 */
export function useCanvasExport(fallbackMessage?: string) {
  const handler = useExportHandler(fallbackMessage);

  const exportCanvas = useCallback(
    async (
      node: HTMLElement | null,
      options: CanvasExportOptions,
    ): Promise<boolean> => {
      if (!node) return false;
      const {
        format,
        filename,
        backgroundColor,
        widthInches = 8.5,
        heightInches = 11,
      } = options;
      const designWidth = Math.max(1, node.offsetWidth);
      const pixelRatio = resolveExportPixelRatio(
        designWidth,
        options.targetWidthPx,
        options.pixelRatio,
      );

      return handler.runExport(async () => {
        if (format === "png") {
          await exportNodeAsPng(node, filename, {
            pixelRatio,
            backgroundColor: backgroundColor ?? undefined,
          });
          return;
        }
        if (format === "pdf") {
          await nodeToPdf(
            node,
            filename,
            widthInches,
            heightInches,
            pixelRatio,
            backgroundColor ?? undefined,
          );
          return;
        }
        if (format === "svg") {
          await exportNodeAsSvg(node, filename);
          return;
        }
        if (format === "zip") {
          const blob = await exportNodeAsBlob(node, {
            pixelRatio,
            backgroundColor: backgroundColor ?? undefined,
          });
          await downloadZip([{ name: filename.replace(/\.zip$/i, ".png"), blob }], filename);
        }
      });
    },
    [handler],
  );

  const exportFromRef = useCallback(
    async (
      ref: RefObject<HTMLElement | null>,
      options: CanvasExportOptions,
    ): Promise<boolean> => exportCanvas(ref.current, options),
    [exportCanvas],
  );

  return {
    ...handler,
    exportCanvas,
    exportFromRef,
    resolveExportPixelRatio,
  };
}
