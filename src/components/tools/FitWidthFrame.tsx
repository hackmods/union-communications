"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Layout children at design size, then uniformly scale the sheet to the
 * preview column. Put this around `[data-export-root]` — never on it.
 * `capture.ts` zeros `transform` on the cloned export root, so scale on
 * that node would export a shrunk (or empty) raster.
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
  /** Horizontal placement of the scaled sheet in the preview column. */
  align?: "start" | "center";
  /** Classes on the scaled-height frame (e.g. shadow outside the export root). */
  frameClassName?: string;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const next = w > 0 ? Math.min(1, w / designWidth) : 1;
      setScale(next);
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [designWidth]);

  const scaledWidth = designWidth * scale;

  return (
    <div
      ref={wrapRef}
      data-fit-width=""
      data-qr-board-fit=""
      className="w-full min-w-0 max-w-full"
    >
      <div
        className={[
          align === "center" ? "mx-auto" : undefined,
          frameClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          position: "relative",
          height: designHeight * scale,
          width: align === "center" ? scaledWidth : undefined,
          maxWidth: "100%",
        }}
      >
        <div
          style={{
            width: designWidth,
            height: designHeight,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
