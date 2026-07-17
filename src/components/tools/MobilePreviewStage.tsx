"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { computePreviewScale } from "@/lib/utils/preview-scale";
import { cn } from "@/lib/utils";

const MINI_MAX_HEIGHT_PX = 120;
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

    const measure = () => {
      const width = content.scrollWidth;
      const height = content.scrollHeight;
      const maxHeight =
        mode === "mini"
          ? MINI_MAX_HEIGHT_PX
          : Math.round(window.innerHeight * FULL_MAX_HEIGHT_VH);
      setNaturalHeight(height);
      setScale(
        computePreviewScale(width, height, frame.clientWidth, maxHeight),
      );
    };

    const ro = new ResizeObserver(measure);
    ro.observe(content);
    ro.observe(frame);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mode]);

  if (mode === "passthrough") {
    return <div className={className}>{children}</div>;
  }

  const scaledHeight =
    naturalHeight > 0 ? Math.ceil(naturalHeight * scale) : undefined;
  const isMini = mode === "mini";

  return (
    <div
      ref={frameRef}
      className={cn(
        "relative w-full overflow-hidden rounded-lg",
        isMini && "border border-gray-200 bg-gray-50 shadow-sm",
        className,
      )}
      style={{ height: scaledHeight }}
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
          className="absolute inset-0 z-10 min-h-11 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
          aria-label={expandLabel}
          onClick={onExpand}
        />
      ) : null}
    </div>
  );
}
