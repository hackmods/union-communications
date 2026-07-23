"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  label,
  id,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const generatedId = useId();
  const selectId = id ?? props.name ?? (label ? generatedId : undefined);
  return (
    <div className="space-y-0.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-label={!label ? props["aria-label"] : undefined}
        className={cn(
          "min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20 focus-visible:outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
