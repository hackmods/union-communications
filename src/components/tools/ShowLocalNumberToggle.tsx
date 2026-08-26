"use client";

import { useTranslations } from "next-intl";

export function ShowLocalNumberToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** When logo is off, local text may still apply on some canvases — keep enabled by default. */
  disabled?: boolean;
}) {
  const tc = useTranslations("common");

  return (
    <label className="flex min-h-11 items-center gap-2.5 text-sm text-opseu-dark">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 disabled:opacity-50"
      />
      {tc("showLocalNumber")}
    </label>
  );
}
