"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToolFormDetailsProps = {
  /** Visible summary label (section title). */
  title: ReactNode;
  children: ReactNode;
  /** When true, section starts open. Default false — keeps dense editors scannable. */
  defaultOpen?: boolean;
  className?: string;
};

/**
 * Collapsible editor section for canvas tool side panels.
 * Secondary controls (ornaments, print size, colours) stay collapsed
 * so primary choices stay readable above the fold.
 */
export function ToolFormDetails({
  title,
  children,
  defaultOpen = false,
  className,
}: ToolFormDetailsProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(e) => {
        setOpen((e.currentTarget as HTMLDetailsElement).open);
      }}
      className={cn(
        "group rounded-lg border border-gray-200 bg-gray-50/60 open:bg-white",
        className,
      )}
    >
      <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-opseu-dark marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          <span>{title}</span>
          <span
            aria-hidden
            className="text-gray-400 transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="space-y-4 border-t border-gray-100 px-3 pb-4 pt-3">
        {children}
      </div>
    </details>
  );
}
