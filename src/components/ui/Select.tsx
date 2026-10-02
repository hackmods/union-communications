"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  label,
  hint,
  error,
  id,
  children,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
}) {
  const generatedId = useId();
  const selectId = id ?? props.name ?? (label || hint || error ? generatedId : undefined);
  const hintId = hint && selectId ? `${selectId}-hint` : undefined;
  const errorId = error && selectId ? `${selectId}-error` : undefined;
  const describedBy = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
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
        aria-describedby={describedBy}
        aria-invalid={error ? true : ariaInvalid}
        className={cn(
          "min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20 focus-visible:outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {hint && hintId ? <p id={hintId} className="text-xs text-gray-600">{hint}</p> : null}
      {error && errorId ? <p id={errorId} className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
