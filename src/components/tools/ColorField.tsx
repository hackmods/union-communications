"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

function normalizeHex(value: string): string {
  const raw = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(raw)) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^[0-9A-Fa-f]{6}$/.test(raw)) return `#${raw}`.toUpperCase();
  return raw.startsWith("#") ? raw.toUpperCase() : value;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorField({ label, value, onChange, className }: ColorFieldProps) {
  const id = useId();
  const pickerId = `${id}-picker`;
  const hexId = `${id}-hex`;
  const hex = normalizeHex(value);
  const pickerValue = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#003DA5";

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={hexId} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <label
          htmlFor={pickerId}
          className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-opseu-blue/30"
          title={hex}
        >
          <span
            className="absolute inset-0"
            style={{ backgroundColor: pickerValue }}
            aria-hidden
          />
          <input
            id={pickerId}
            type="color"
            value={pickerValue}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} colour picker`}
          />
        </label>
        <input
          id={hexId}
          type="text"
          value={hex}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            const next = e.target.value;
            if (next === "" || next === "#") {
              onChange(next);
              return;
            }
            onChange(normalizeHex(next));
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-base uppercase tracking-wide focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20"
          aria-label={`${label} hex value`}
        />
      </div>
    </div>
  );
}
