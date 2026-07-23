"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BRAND_COLORS } from "@/lib/constants/brand";
import {
  brandPaletteHasContrastRisk,
  pickContrastingInk,
} from "@/lib/utils/ink";
import { BrandContrastConfirmDialog } from "@/components/brand/BrandContrastConfirmDialog";
import { Callout } from "@/components/ui/Callout";
import { ColorField } from "./ColorField";
import { ContrastChecker } from "./ContrastChecker";

interface ThemePickerProps {
  primaryColor: string;
  secondaryColor: string;
  /** Optional Brand Kit accent — included in clash checks when provided. */
  accentColor?: string;
  onPrimaryChange: (color: string) => void;
  onSecondaryChange: (color: string) => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  /**
   * Brand Kit persistence path: draft colours locally, then confirm before
   * committing a palette that newly fails contrast checks.
   */
  confirmLowContrast?: boolean;
}

export function ThemePicker({
  primaryColor,
  secondaryColor,
  accentColor,
  onPrimaryChange,
  onSecondaryChange,
  primaryLabel = "Primary colour",
  secondaryLabel = "Secondary colour",
  confirmLowContrast = false,
}: ThemePickerProps) {
  const t = useTranslations("brandKit.contrastAdvisory");
  const [draftPrimary, setDraftPrimary] = useState(primaryColor);
  const [draftSecondary, setDraftSecondary] = useState(secondaryColor);
  const [syncedFrom, setSyncedFrom] = useState({
    primary: primaryColor,
    secondary: secondaryColor,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<{
    primary: string;
    secondary: string;
  } | null>(null);

  // Keep drafts aligned with persisted Brand Kit colours (skip while confirm is open).
  if (
    !confirmOpen &&
    (syncedFrom.primary !== primaryColor ||
      syncedFrom.secondary !== secondaryColor)
  ) {
    setSyncedFrom({ primary: primaryColor, secondary: secondaryColor });
    setDraftPrimary(primaryColor);
    setDraftSecondary(secondaryColor);
  }

  const displayPrimary = confirmLowContrast ? draftPrimary : primaryColor;
  const displaySecondary = confirmLowContrast ? draftSecondary : secondaryColor;

  const paletteRisk = brandPaletteHasContrastRisk({
    primary: displayPrimary,
    secondary: displaySecondary,
    accent: accentColor,
  });

  const commitPalette = (nextPrimary: string, nextSecondary: string) => {
    const nextRisk = brandPaletteHasContrastRisk({
      primary: nextPrimary,
      secondary: nextSecondary,
      accent: accentColor,
    });
    const currentRisk = brandPaletteHasContrastRisk({
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
    });

    if (confirmLowContrast && nextRisk && !currentRisk) {
      setPending({ primary: nextPrimary, secondary: nextSecondary });
      setConfirmOpen(true);
      return;
    }

    if (nextPrimary !== primaryColor) onPrimaryChange(nextPrimary);
    if (nextSecondary !== secondaryColor) onSecondaryChange(nextSecondary);
  };

  const handlePrimaryLive = (color: string) => {
    if (confirmLowContrast) {
      setDraftPrimary(color);
      return;
    }
    onPrimaryChange(color);
  };

  const handleSecondaryLive = (color: string) => {
    if (confirmLowContrast) {
      setDraftSecondary(color);
      return;
    }
    onSecondaryChange(color);
  };

  const handlePrimaryCommit = (color: string) => {
    if (!confirmLowContrast) return;
    commitPalette(color, draftSecondary);
  };

  const handleSecondaryCommit = (color: string) => {
    if (!confirmLowContrast) return;
    commitPalette(draftPrimary, color);
  };

  const confirmSave = () => {
    if (!pending) return;
    onPrimaryChange(pending.primary);
    onSecondaryChange(pending.secondary);
    setPending(null);
    setConfirmOpen(false);
  };

  const cancelSave = () => {
    setPending(null);
    setConfirmOpen(false);
    setDraftPrimary(primaryColor);
    setDraftSecondary(secondaryColor);
  };

  const resetDefaults = () => {
    const nextPrimary = BRAND_COLORS.primary;
    const nextSecondary = BRAND_COLORS.secondary;
    if (confirmLowContrast) {
      setDraftPrimary(nextPrimary);
      setDraftSecondary(nextSecondary);
      commitPalette(nextPrimary, nextSecondary);
      return;
    }
    onPrimaryChange(nextPrimary);
    onSecondaryChange(nextSecondary);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField
          label={primaryLabel}
          value={displayPrimary}
          onChange={handlePrimaryLive}
          onCommit={confirmLowContrast ? handlePrimaryCommit : undefined}
        />
        <ColorField
          label={secondaryLabel}
          value={displaySecondary}
          onChange={handleSecondaryLive}
          onCommit={confirmLowContrast ? handleSecondaryCommit : undefined}
        />
      </div>
      <ContrastChecker
        foreground={pickContrastingInk(displayPrimary)}
        background={displayPrimary}
      />
      <ContrastChecker
        foreground={pickContrastingInk(displaySecondary)}
        background={displaySecondary}
      />
      {paletteRisk ? (
        <Callout
          tone="danger"
          role="status"
          className="border-amber-300 bg-amber-50 text-amber-950"
        >
          {t("inline")}
        </Callout>
      ) : null}
      <button
        type="button"
        className="text-sm text-opseu-blue underline"
        onClick={resetDefaults}
      >
        {t("resetDefaults")}
      </button>

      <BrandContrastConfirmDialog
        open={confirmOpen}
        onConfirm={confirmSave}
        onCancel={cancelSave}
      />
    </div>
  );
}
