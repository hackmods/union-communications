import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "amber" | "muted" | "danger" | "success";

export type { Tone };

type EyebrowProps = {
  children: ReactNode;
  tone?: Tone;
  /** Tracked uppercase label — eyebrow pattern. */
  tracking?: "wider" | "wide";
  className?: string;
  as?: "p" | "span" | "div";
};

const toneClass: Record<Tone, string> = {
  brand: "text-opseu-blue",
  amber: "text-amber-700",
  muted: "text-slate-500",
  danger: "text-red-700",
  success: "text-emerald-700",
};

/**
 * Tracked, uppercase micro-label that sits above an h2 / h3 to set context.
 * Swap-in for the 40+ inline `text-xs font-semibold uppercase tracking-wide
 * text-gray-500` copies that had drifted across public pages.
 */
export function Eyebrow({
  children,
  tone = "brand",
  tracking = "wider",
  className,
  as: Tag = "p",
}: EyebrowProps) {
  return (
    <Tag
      className={cn(
        "text-xs font-semibold uppercase",
        tracking === "wider" ? "tracking-[0.18em]" : "tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
