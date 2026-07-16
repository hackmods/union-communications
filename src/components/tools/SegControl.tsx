"use client";

import { cn } from "@/lib/utils";

type SegOption<T extends string> = {
  value: T;
  label: string;
};

type SegControlProps<T extends string> = {
  label: string;
  value: T;
  options: SegOption<T>[];
  onChange: (value: T) => void;
  className?: string;
};

/** Accessible segmented control (radiogroup) for tool format/layout pills. */
export function SegControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegControlProps<T>) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-2"
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={cn(
                "min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
                selected
                  ? "bg-opseu-blue text-white"
                  : "border border-gray-300 bg-white text-opseu-dark hover:bg-gray-50",
              )}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
