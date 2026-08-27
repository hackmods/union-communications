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
  children,
}: {
  designWidth: number;
  designHeight: number;
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

  return (
    <div
      ref={wrapRef}
      data-fit-width=""
      data-qr-board-fit=""
      className="w-full min-w-0 max-w-full"
    >
      <div
        style={{
          position: "relative",
          height: designHeight * scale,
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
