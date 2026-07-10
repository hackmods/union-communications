"use client";

import { useTranslations } from "next-intl";
import { usePreferencesStore } from "@/store/preferences-store";
import type { FontSize } from "@/types/preferences";
import { cn } from "@/lib/utils";

const FONT_SIZES: FontSize[] = ["default", "large", "larger", "maximum"];

interface DisplaySettingsControlsProps {
  variant?: "panel" | "compact";
  className?: string;
}

export function DisplaySettingsControls({
  variant = "panel",
  className,
}: DisplaySettingsControlsProps) {
  const t = useTranslations("accessibility.display");
  const preferences = usePreferencesStore((s) => s.preferences);
  const setFontSize = usePreferencesStore((s) => s.setFontSize);
  const setHighContrast = usePreferencesStore((s) => s.setHighContrast);
  const setReducedMotion = usePreferencesStore((s) => s.setReducedMotion);

  const isCompact = variant === "compact";

  return (
    <div className={cn("space-y-5", className)}>
      <fieldset>
        <legend className={cn("font-semibold text-opseu-dark", isCompact ? "text-sm" : "text-base")}>
          {t("fontSizeLabel")}
        </legend>
        <p
          id="font-size-description"
          className={cn("mt-1 text-gray-600", isCompact ? "text-sm" : "text-base")}
        >
          {t("fontSizeDescription")}
        </p>
        <div
          role="radiogroup"
          aria-labelledby="font-size-description"
          className={cn("mt-3 grid gap-2", isCompact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}
        >
          {FONT_SIZES.map((size) => (
            <label
              key={size}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                preferences.fontSize === size
                  ? "border-opseu-blue bg-opseu-blue/5 font-medium"
                  : "border-gray-200 hover:border-opseu-blue/40",
              )}
            >
              <input
                type="radio"
                name="font-size"
                value={size}
                checked={preferences.fontSize === size}
                onChange={() => setFontSize(size)}
                className="accent-opseu-blue"
              />
              <span className={isCompact ? "text-sm" : "text-base"}>{t(`fontSize.${size}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-2">
          <span>
            <span className={cn("block font-medium text-opseu-dark", isCompact ? "text-sm" : "text-base")}>
              {t("highContrastLabel")}
            </span>
            <span className={cn("text-gray-600", isCompact ? "text-sm" : "text-base")}>
              {t("highContrastDescription")}
            </span>
          </span>
          <input
            type="checkbox"
            checked={preferences.highContrast}
            onChange={(e) => setHighContrast(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-opseu-blue"
            aria-label={t("highContrastLabel")}
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-2">
          <span>
            <span className={cn("block font-medium text-opseu-dark", isCompact ? "text-sm" : "text-base")}>
              {t("reducedMotionLabel")}
            </span>
            <span className={cn("text-gray-600", isCompact ? "text-sm" : "text-base")}>
              {t("reducedMotionDescription")}
            </span>
          </span>
          <input
            type="checkbox"
            checked={preferences.reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-opseu-blue"
            aria-label={t("reducedMotionLabel")}
          />
        </label>
      </div>

      {!isCompact && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-500">{t("previewLabel")}</p>
          <p className="mt-2 text-base text-gray-800">{t("previewText")}</p>
        </div>
      )}
    </div>
  );
}
