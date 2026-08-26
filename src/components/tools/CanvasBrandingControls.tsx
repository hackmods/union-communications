"use client";

import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import { LogoModeSegControl } from "@/components/tools/LogoModeSegControl";
import { ShowLocalNumberToggle } from "@/components/tools/ShowLocalNumberToggle";

/** Logo mode + optional local-number label — shared across canvas tools. */
export function CanvasBrandingControls({
  logoMode,
  onLogoModeChange,
  showLocalNumber,
  onShowLocalNumberChange,
  logoLabel,
}: {
  logoMode: BoardLogoMode;
  onLogoModeChange: (mode: BoardLogoMode) => void;
  showLocalNumber: boolean;
  onShowLocalNumberChange: (show: boolean) => void;
  /** Defaults to common.logoMode */
  logoLabel?: string;
}) {
  return (
    <>
      <LogoModeSegControl
        value={logoMode}
        onChange={onLogoModeChange}
        label={logoLabel}
      />
      <ShowLocalNumberToggle
        checked={showLocalNumber}
        onChange={onShowLocalNumberChange}
      />
    </>
  );
}
