"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
};

export function Checkbox({
  className,
  label,
  description,
  id,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? (label ? generatedId : undefined);
  const descriptionId = description ? `${inputId}-desc` : undefined;

  const control = (
    <input
      type="checkbox"
      id={inputId}
      aria-describedby={descriptionId}
      aria-label={!label ? props["aria-label"] : undefined}
      className={cn(
        "mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-opseu-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
        className,
      )}
      {...props}
    />
  );

  if (!label && !description) {
    return control;
  }

  return (
    <div className="flex items-start gap-2 text-sm text-gray-800">
      {control}
      <div className="min-w-0">
        {label && (
          <label htmlFor={inputId} className="cursor-pointer font-medium">
            {label}
          </label>
        )}
        {description && (
          <p id={descriptionId} className="mt-0.5 text-gray-600">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
