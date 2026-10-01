"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  label,
  hint,
  error,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
}) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? (label || hint || error ? generatedId : undefined);
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-0.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-label={!label ? props["aria-label"] : undefined}
        aria-describedby={describedBy}
        aria-invalid={error ? true : ariaInvalid}
        className={cn(
          "min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20",
          className,
        )}
        {...props}
      />
      {hint && hintId ? <p id={hintId} className="text-xs text-gray-600">{hint}</p> : null}
      {error && errorId ? <p id={errorId} className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export function Textarea({
  className,
  label,
  hint,
  error,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
}) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? (label || hint || error ? generatedId : undefined);
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-0.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        aria-describedby={describedBy}
        aria-invalid={error ? true : ariaInvalid}
        className={cn(
          "min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20",
          className,
        )}
        {...props}
      />
      {hint && hintId ? <p id={hintId} className="text-xs text-gray-600">{hint}</p> : null}
      {error && errorId ? <p id={errorId} className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
