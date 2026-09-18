import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "amber" | "muted" | "outline" | "danger";

type IconChipProps = {
  /** Decorative SVG / icon. Caller marks aria-hidden inside the SVG. */
  children: ReactNode;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const toneClass: Record<Tone, string> = {
  brand: "bg-opseu-blue/10 text-opseu-blue",
  amber: "bg-amber-100 text-amber-800",
  muted: "bg-slate-100 text-slate-700",
  outline: "bg-white text-opseu-blue ring-1 ring-opseu-blue/30",
  danger: "bg-red-100 text-red-800",
};

const sizeClass = {
  sm: "h-8 w-8 [&>svg]:h-4 [&>svg]:w-4",
  md: "h-10 w-10 [&>svg]:h-5 [&>svg]:w-5",
  lg: "h-12 w-12 [&>svg]:h-6 [&>svg]:w-6",
};

/**
 * Rounded square that hosts an icon. Sets the affordance of the row it sits in
 * (Path card, channel tile, info band). Pass an inline `<svg aria-hidden>` as
 * children. Replaces the 6+ inline copies in HomeContent, OfficerLearning,
 * Steward101ModuleNav, examples/ExampleCard, pulse-poll preview.
 */
export function IconChip({
  children,
  tone = "brand",
  size = "md",
  className,
}: IconChipProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        toneClass[tone],
        sizeClass[size],
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}
