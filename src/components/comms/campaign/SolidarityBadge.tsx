"use client";

import { pickContrastingInk } from "@/lib/utils/ink";
import { cn } from "@/lib/utils";

export type SolidarityBadgeProps = {
  label: string;
  backgroundColor: string;
  textColor?: string;
  className?: string;
};

/** Small coalition or caucus badge for canvas corners. */
export function SolidarityBadge({
  label,
  backgroundColor,
  textColor,
  className,
}: SolidarityBadgeProps) {
  const ink = textColor ?? pickContrastingInk(backgroundColor);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        className,
      )}
      style={{ backgroundColor, color: ink }}
    >
      {label}
    </span>
  );
}
