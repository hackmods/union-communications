"use client";

import { useTranslations } from "next-intl";
import {
  getUnionPreset,
  presetSloganCandidates,
} from "@/lib/constants/unionPresets";

type PresetSloganPickerProps = {
  presetId: string;
  onApply: (slogan: string) => void;
};

/** Tap-to-apply slogan list for a union preset (locale-aware when i18n rows exist). */
export function PresetSloganPicker({
  presetId,
  onApply,
}: PresetSloganPickerProps) {
  const t = useTranslations("brandKit");
  const preset = getUnionPreset(presetId);
  if (!preset) return null;

  let localized: string[] | undefined;
  try {
    const raw = t.raw(`presetSlogans.${presetId}.items`);
    if (Array.isArray(raw) && raw.length > 0) {
      localized = raw as string[];
    }
  } catch {
    /* preset has no i18n slogan list */
  }

  const slogans = presetSloganCandidates(preset, localized);
  if (slogans.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{t("unionPreset.slogans")}</p>
      <ul className="mt-1 space-y-1">
        {slogans.map((slogan) => (
          <li key={slogan}>
            <button
              type="button"
              className="text-left text-sm text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              onClick={() => onApply(slogan)}
            >
              {slogan}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-gray-500">{t("unionPreset.sloganApplyHint")}</p>
    </div>
  );
}
