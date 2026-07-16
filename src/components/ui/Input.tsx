"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  label,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? (label ? generatedId : undefined);
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
        className={cn(
          "min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function Textarea({
  className,
  label,
  id,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? (label ? generatedId : undefined);
  return (
    <div className="space-y-0.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20",
          className,
        )}
        {...props}
      />
    </div>
  );
}
