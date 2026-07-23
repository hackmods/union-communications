import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

/**
 * Pulsing placeholder block. Animation is suppressed when the user prefers
 * reduced motion (`prefers-reduced-motion` / `data-reduced-motion` in globals.css).
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      aria-hidden="true"
    />
  );
}
