"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TooltipProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** Lightweight accessible tooltip via title + aria-describedby. */
export function Tooltip({ label, children, className }: TooltipProps) {
  const id = useId();
  return (
    <span className={cn("inline-flex", className)}>
      <span aria-describedby={id} title={label} className="inline-flex">
        {children}
      </span>
      <span id={id} className="sr-only">
        {label}
      </span>
    </span>
  );
}
