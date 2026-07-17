"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { computePreviewScale } from "@/lib/utils/preview-scale";
import { cn } from "@/lib/utils";

const MINI_VIEWPORT_PX = 96;
const FULL_MAX_HEIGHT_VH = 0.7;

type MobilePreviewStageProps = {
  mode: "mini" | "full" | "passthrough";
  onExpand?: () => void;
  expandLabel?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Scales live preview content to fit a mini rail or a capped full preview.
 * Passthrough leaves children unscaled (desktop / lg+).
 */
export function MobilePreviewStage({
  mode,
  onExpand,
  expandLabel,
  children,
  className,
}: MobilePreviewStageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useLayoutEffect(() => {
    if (mode === "passthrough") return;

    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;

    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Measure unscaled layout size (transform does not affect scroll size).
        const width = content.scrollWidth;
        const height = content.scrollHeight;
        const maxHeight =
          mode === "mini"
            ? MINI_VIEWPORT_PX
            : Math.round(window.innerHeight * FULL_MAX_HEIGHT_VH);
        setNaturalHeight(height);
        setScale(
          computePreviewScale(width, height, frame.clientWidth, maxHeight),
        );
      });
    };

    const ro = new ResizeObserver(measure);
    ro.observe(content);
    ro.observe(frame);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mode]);

  if (mode === "passthrough") {
    return <div className={className}>{children}</div>;
  }

  const isMini = mode === "mini";
  const fullHeight =
    naturalHeight > 0 ? Math.ceil(naturalHeight * scale) : undefined;

  return (
    <div
      ref={frameRef}
      className={cn(
        "relative w-full overflow-hidden",
        isMini
          ? "flex h-24 items-start justify-center rounded-md bg-gray-100"
          : "rounded-lg",
        className,
      )}
      style={isMini ? undefined : { height: fullHeight }}
    >
      <div
        ref={contentRef}
        className="origin-top will-change-transform"
        style={{
          width: "100%",
          transform: scale === 1 ? undefined : `scale(${scale})`,
        }}
        // Peek mode: block nested controls; expand is the overlay button.
        inert={isMini ? true : undefined}
      >
        {children}
      </div>
      {isMini && onExpand ? (
        <button
          type="button"
          className="absolute inset-0 z-10 min-h-11 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
          aria-label={expandLabel}
          title={expandLabel}
          onClick={onExpand}
        />
      ) : null}
    </div>
  );
}
