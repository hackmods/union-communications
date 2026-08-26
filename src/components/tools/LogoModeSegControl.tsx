"use client";

import { useTranslations } from "next-intl";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import { SegControl } from "@/components/tools/SegControl";

const LOGO_MODE_LABEL_KEY: Record<
  BoardLogoMode,
  "logoNone" | "logoLockup" | "logoMark"
> = {
  none: "logoNone",
  lockup: "logoLockup",
  mark: "logoMark",
};

const LOGO_MODE_ORDER: readonly BoardLogoMode[] = [
  "none",
  "lockup",
  "mark",
] as const;

export function LogoModeSegControl({
  value,
  onChange,
  label,
}: {
  value: BoardLogoMode;
  onChange: (mode: BoardLogoMode) => void;
  /** Defaults to common.logoMode */
  label?: string;
}) {
  const tc = useTranslations("common");
  const modeLabel = label ?? tc("logoMode");

  return (
    <SegControl
      label={modeLabel}
      value={value}
      options={LOGO_MODE_ORDER.map((mode) => ({
        value: mode,
        label: tc(LOGO_MODE_LABEL_KEY[mode]),
      }))}
      onChange={onChange}
    />
  );
}
