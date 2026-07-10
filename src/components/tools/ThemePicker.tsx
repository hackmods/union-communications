"use client";

import { BRAND_COLORS } from "@/lib/constants/brand";
import { ColorField } from "./ColorField";
import { ContrastChecker } from "./ContrastChecker";

interface ThemePickerProps {
  primaryColor: string;
  secondaryColor: string;
  onPrimaryChange: (color: string) => void;
  onSecondaryChange: (color: string) => void;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export function ThemePicker({
  primaryColor,
  secondaryColor,
  onPrimaryChange,
  onSecondaryChange,
  primaryLabel = "Primary colour",
  secondaryLabel = "Secondary colour",
}: ThemePickerProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField
          label={primaryLabel}
          value={primaryColor}
          onChange={onPrimaryChange}
        />
        <ColorField
          label={secondaryLabel}
          value={secondaryColor}
          onChange={onSecondaryChange}
        />
      </div>
      <ContrastChecker foreground="#FFFFFF" background={primaryColor} />
      <ContrastChecker foreground={primaryColor} background="#FFFFFF" />
      <button
        type="button"
        className="text-sm text-opseu-blue underline"
        onClick={() => {
          onPrimaryChange(BRAND_COLORS.primary);
          onSecondaryChange(BRAND_COLORS.secondary);
        }}
      >
        Reset to tenant defaults
      </button>
    </div>
  );
}
