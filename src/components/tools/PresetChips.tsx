"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PresetChipOption<T extends string> {
  value: T;
  label: ReactNode;
}

type PresetChipsProps<T extends string> = {
  label: string;
  value: T;
  options: readonly PresetChipOption<T>[];
  onChange: (value: T) => void;
  /** Base grid columns (2 default; expands at sm). */
  columns?: 2 | 3 | 4;
  /** Relative path segment / deep-link key for tests (data-preset-value). */
  className?: string;
};

/**
 * Shared visual preset picker: chip grid so content presets are visible at a
 * glance (flyer-maker pattern) — never a `<select>`. Carries `data-preset-value`
 * and `aria-pressed` for stable test + a11y hooks.
 */
export function PresetChips<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 2,
  className,
}: PresetChipsProps<T>) {
  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      <div
        className={cn(
          "grid gap-2",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-2 sm:grid-cols-3",
          columns === 4 && "grid-cols-2 sm:grid-cols-4",
        )}
        role="group"
        aria-label={label}
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              data-preset-value={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "min-h-11 min-w-0 rounded-lg border px-2.5 py-2 text-left text-sm font-semibold leading-snug text-opseu-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
                selected
                  ? "border-opseu-blue ring-2 ring-opseu-blue/30"
                  : "border-gray-200 hover:border-opseu-blue/40",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}