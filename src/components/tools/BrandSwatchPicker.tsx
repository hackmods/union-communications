"use client";

import { BRAND_COLORS } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export type BrandSwatchId = "primary" | "accent" | "secondary" | "black";

export interface BrandSwatch {
  id: BrandSwatchId;
  hex: string;
  label: string;
}

interface BrandSwatchPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  /** Colours from the active brand kit; black is always offered. */
  colors: {
    primary: string;
    accent: string;
    secondary: string;
  };
  className?: string;
}

export function buildBrandSwatches(
  colors: BrandSwatchPickerProps["colors"],
  labels: Record<BrandSwatchId, string>,
): BrandSwatch[] {
  return [
    { id: "primary", hex: colors.primary, label: labels.primary },
    { id: "accent", hex: colors.accent, label: labels.accent },
    { id: "secondary", hex: colors.secondary, label: labels.secondary },
    { id: "black", hex: BRAND_COLORS.black, label: labels.black },
  ];
}

function normalizeHex(value: string): string {
  const raw = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9A-F]{3}$/.test(raw)) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return raw;
}

export function BrandSwatchPicker({
  label,
  value,
  onChange,
  colors,
  className,
}: BrandSwatchPickerProps) {
  const t = useTranslations("assets");
  const swatches = buildBrandSwatches(colors, {
    primary: t("swatchPrimary"),
    accent: t("swatchAccent"),
    secondary: t("swatchSecondary"),
    black: t("swatchBlack"),
  });
  const selected = normalizeHex(value);

  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="text-sm font-medium text-gray-700">{label}</legend>
      <div className="flex flex-wrap gap-2" role="listbox" aria-label={label}>
        {swatches.map((swatch) => {
          const hex = normalizeHex(swatch.hex);
          const isSelected = selected === hex;
          return (
            <button
              key={swatch.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              title={`${swatch.label} (${hex})`}
              onClick={() => onChange(hex)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg p-1.5 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
                isSelected
                  ? "ring-2 ring-opseu-blue ring-offset-1"
                  : "hover:ring-1 hover:ring-gray-300",
              )}
            >
              <span
                className="h-10 w-10 rounded-md border border-gray-200 shadow-sm"
                style={{ backgroundColor: hex }}
                aria-hidden
              />
              <span className="max-w-14 truncate text-center text-xs text-gray-600">
                {swatch.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
