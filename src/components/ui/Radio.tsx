"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type RadioGroupProps = React.FieldsetHTMLAttributes<HTMLFieldSetElement> & {
  legend?: React.ReactNode;
  description?: React.ReactNode;
};

export function RadioGroup({
  className,
  legend,
  description,
  children,
  ...props
}: RadioGroupProps) {
  const generatedId = useId();
  const descriptionId = description ? `${generatedId}-desc` : undefined;

  return (
    <fieldset
      className={cn("space-y-2", className)}
      aria-describedby={descriptionId}
      {...props}
    >
      {legend && (
        <legend className="text-sm font-medium text-gray-700">{legend}</legend>
      )}
      {description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {description}
        </p>
      )}
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: React.ReactNode;
};

export function Radio({ className, label, id, ...props }: RadioProps) {
  const generatedId = useId();
  const inputId = id ?? (props.name && props.value
    ? `${props.name}-${String(props.value)}`
    : generatedId);

  return (
    <label
      htmlFor={inputId}
      className="flex cursor-pointer items-center gap-2 text-sm text-gray-800"
    >
      <input
        type="radio"
        id={inputId}
        className={cn(
          "h-4 w-4 shrink-0 border-gray-300 accent-opseu-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
          className,
        )}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
