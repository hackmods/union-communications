import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GuideWideFigureProps = {
  children: ReactNode;
  className?: string;
  /** Accessible name when the figure is purely visual */
  ariaLabel?: string;
};

/**
 * Diagrams and tables that should span the article column at lg+, not prose measure.
 */
export function GuideWideFigure({
  children,
  className,
  ariaLabel,
}: GuideWideFigureProps) {
  return (
    <figure
      className={cn("mt-5 w-full min-w-0 lg:max-w-none", className)}
      {...(ariaLabel ? { role: "group", "aria-label": ariaLabel } : {})}
    >
      {children}
    </figure>
  );
}
