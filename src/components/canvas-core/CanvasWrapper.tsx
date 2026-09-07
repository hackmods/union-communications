"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import type { CanvasMode } from "./types";

const CANVAS_CONTAINER_NAME = "unionops-canvas";

export type CanvasWrapperProps = {
  designWidth: number;
  /** Required for mode "fixed". Ignored for intrinsic height frames. */
  designHeight?: number;
  mode?: CanvasMode;
  /**
   * Max uniform scale into the preview column. Default 2 lets letter sheets
   * grow to fill a wide sticky preview (CANVAS-003). Pass 1 to match legacy
   * FitWidthFrame (scale down only).
   */
  maxScale?: number;
  minScale?: number;
  align?: "start" | "center";
  frameClassName?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Layout children at design size, establish the canvas container for cq units,
 * and uniformly scale the sheet to the preview column.
 *
 * Put this around `[data-export-root]` — never on it. `capture.ts` zeroes
 * transform on the cloned export root.
 */
export function CanvasWrapper({
  designWidth,
  designHeight,
  mode = "fixed",
  maxScale = 2,
  minScale = 0,
  align = "start",
  frameClassName,
  className,
  children,
}: CanvasWrapperProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (!(w > 0) || !(designWidth > 0)) {
        setScale(1);
        return;
      }
      const raw = w / designWidth;
      const next = Math.min(maxScale, Math.max(minScale, raw));
      setScale(next);
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [designWidth, maxScale, minScale]);

  const scaledWidth = designWidth * scale;
  const scaledHeight =
    mode === "fixed" && designHeight != null ? designHeight * scale : undefined;

  const sheetStyle: CSSProperties = {
    width: designWidth,
    height: mode === "fixed" && designHeight != null ? designHeight : undefined,
    transform: scale === 1 ? undefined : `scale(${scale})`,
    transformOrigin: "top left",
    // Container for cqw/cqh — name so nested containers cannot re-base units.
    containerType: mode === "fixed" ? "size" : "inline-size",
    containerName: CANVAS_CONTAINER_NAME,
  };

  return (
    <div
      ref={wrapRef}
      data-fit-width=""
      data-canvas-wrapper=""
      data-canvas-mode={mode}
      data-qr-board-fit=""
      className={cn("w-full min-w-0 max-w-full", className)}
    >
      <div
        className={cn(
          align === "center" ? "mx-auto" : undefined,
          frameClassName,
        )}
        style={{
          position: "relative",
          height: scaledHeight,
          width: align === "center" ? scaledWidth : undefined,
          maxWidth: "100%",
        }}
      >
        <div style={sheetStyle}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Legacy name — scale-down-only wrapper. Prefer CanvasWrapper with an explicit
 * maxScale when migrating tools.
 */
export function FitWidthFrame({
  designWidth,
  designHeight,
  align = "start",
  frameClassName,
  children,
}: {
  designWidth: number;
  designHeight: number;
  align?: "start" | "center";
  frameClassName?: string;
  children: ReactNode;
}) {
  return (
    <CanvasWrapper
      designWidth={designWidth}
      designHeight={designHeight}
      mode="fixed"
      maxScale={1}
      align={align}
      frameClassName={frameClassName}
    >
      {children}
    </CanvasWrapper>
  );
}

export { CANVAS_CONTAINER_NAME };
