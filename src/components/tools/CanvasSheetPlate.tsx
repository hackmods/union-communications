"use client";

import type { ReactNode } from "react";
import {
  CanvasWrapper,
  type CanvasWrapperProps,
} from "@/components/canvas-core";
import { cn } from "@/lib/utils";

type CanvasSheetPlateProps = Omit<CanvasWrapperProps, "className"> & {
  /** Optional small caption under the plate (e.g. print size). */
  caption?: ReactNode;
  className?: string;
};

/**
 * Shared gallery plate for canvas tool previews: grey mat + drop shadow
 * around a scaled sheet, with an optional caption. Wraps `CanvasWrapper`,
 * which owns the capture-safe transform (`[data-export-root]` parent).
 */
export function CanvasSheetPlate({
  caption,
  className,
  children,
  ...wrapper
}: CanvasSheetPlateProps) {
  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-full", className)}>
      <div className="rounded-lg border border-gray-200 bg-gray-100/80 p-4 md:p-6">
        <div className="overflow-hidden rounded-lg shadow-lg">
          <CanvasWrapper {...wrapper}>{children}</CanvasWrapper>
        </div>
      </div>
      {caption ? (
        <p className="mt-3 text-center text-xs text-gray-500">{caption}</p>
      ) : null}
    </div>
  );
}