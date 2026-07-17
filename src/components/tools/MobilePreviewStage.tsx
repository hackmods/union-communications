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
 *
 * Always keeps the same wrapper tree so mode changes do not remount children
 * (iframes / canvases remounting mid-nav caused React removeChild crashes).
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

  const isPassthrough = mode === "passthrough";
  const isMini = mode === "mini";
  const displayScale = isPassthrough ? 1 : scale;
  const displayNaturalHeight = isPassthrough ? 0 : naturalHeight;

  useLayoutEffect(() => {
    if (isPassthrough) return;

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
    measure();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mode, isPassthrough]);

  const fullHeight =
    !isPassthrough && !isMini && displayNaturalHeight > 0
      ? Math.ceil(displayNaturalHeight * displayScale)
      : undefined;

  return (
    <div
      ref={frameRef}
      className={cn(
        "relative w-full",
        !isPassthrough && "overflow-hidden",
        isMini &&
          "flex h-24 items-start justify-center rounded-md bg-gray-100",
        !isPassthrough && !isMini && "rounded-lg",
        className,
      )}
      style={fullHeight ? { height: fullHeight } : undefined}
    >
      <div
        ref={contentRef}
        className={cn(!isPassthrough && "origin-top will-change-transform")}
        style={{
          width: "100%",
          transform:
            !isPassthrough && displayScale !== 1
              ? `scale(${displayScale})`
              : undefined,
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
