"use client";

import { useEffect } from "react";
import {
  findScaledTransformAncestor,
  type CaptureOptions,
} from "@/lib/export/capture";
import { captureNodeToPngDataUrl } from "@/lib/export/image-export";
import { EXPORT_ROOT_SELECTOR } from "@/lib/export/export-root";

type UnionOpsExportBridge = {
  __unionopsCaptureExportRoot?: (
    opts?: CaptureOptions,
  ) => Promise<string>;
  __unionopsBeginUnscaleExportRoot?: () => void;
  __unionopsEndUnscaleExportRoot?: () => void;
};

/**
 * Exposes capture helpers on `window` for Playwright Phase 9e fidelity tests.
 * Production no-ops cost is one effect; methods are only called from e2e.
 */
export function ExportCaptureBridge() {
  useEffect(() => {
    const w = window as Window & UnionOpsExportBridge;
    let scaledEl: HTMLElement | null = null;
    let previousTransform = "";

    w.__unionopsCaptureExportRoot = (opts) => {
      const node = document.querySelector<HTMLElement>(EXPORT_ROOT_SELECTOR);
      if (!node) {
        return Promise.reject(new Error("missing data-export-root"));
      }
      return captureNodeToPngDataUrl(node, opts ?? { pixelRatio: 2 });
    };

    w.__unionopsBeginUnscaleExportRoot = () => {
      const node = document.querySelector<HTMLElement>(EXPORT_ROOT_SELECTOR);
      if (!node) return;
      scaledEl = findScaledTransformAncestor(node);
      if (!scaledEl) return;
      previousTransform = scaledEl.style.transform;
      scaledEl.style.transform = "none";
    };

    w.__unionopsEndUnscaleExportRoot = () => {
      if (scaledEl) {
        scaledEl.style.transform = previousTransform;
      }
      scaledEl = null;
      previousTransform = "";
    };

    return () => {
      delete w.__unionopsCaptureExportRoot;
      delete w.__unionopsBeginUnscaleExportRoot;
      delete w.__unionopsEndUnscaleExportRoot;
    };
  }, []);

  return null;
}
