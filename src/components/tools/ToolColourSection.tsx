"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { ColorField } from "@/components/tools/ColorField";

export interface ToolColourSectionProps {
  primaryColor: string;
  secondaryColor: string;
  onPrimaryChange: (color: string) => void;
  onSecondaryChange: (color: string) => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  accentColor?: string;
  /** When provided, renders an editable accent ColorField after ThemePicker. */
  onAccentChange?: (color: string) => void;
  accentLabel?: string;
  /** Extra fields after ThemePicker (e.g. text colour). */
  children?: ReactNode;
  /** Override the collapsed section title (defaults to common.sectionColours). */
  title?: string;
  className?: string;
}

/**
 * Shared collapsed Colours section: ThemePicker (includes ContrastChecker)
 * inside ToolFormDetails. Prefer this for ThemePicker tools; Flyer Maker
 * keeps BrandSwatchPicker; Brand Kit–direct tools skip colour overrides.
 *
 * Pass `onAccentChange` (with `accentColor`) to surface the accent layer
 * so layouts that render an accent band/rail stay editable (2026-09-13).
 */
export function ToolColourSection({
  primaryColor,
  secondaryColor,
  onPrimaryChange,
  onSecondaryChange,
  primaryLabel,
  secondaryLabel,
  accentColor,
  onAccentChange,
  accentLabel,
  children,
  title,
  className,
}: ToolColourSectionProps) {
  const tc = useTranslations("common");
  return (
    <ToolFormDetails title={title ?? tc("sectionColours")} className={className}>
      <ThemePicker
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        accentColor={accentColor}
        onPrimaryChange={onPrimaryChange}
        onSecondaryChange={onSecondaryChange}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
      />
      {onAccentChange ? (
        <ColorField
          label={accentLabel ?? tc("accentColour")}
          value={accentColor ?? secondaryColor}
          onChange={onAccentChange}
        />
      ) : null}
      {children}
    </ToolFormDetails>
  );
}
