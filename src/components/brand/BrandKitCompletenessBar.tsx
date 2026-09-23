"use client";

import { useTranslations } from "next-intl";
import { measureBrandKitCompleteness } from "@/lib/brand/brand-kit-completeness";
import type { BrandKit } from "@/types/entities";

export function BrandKitCompletenessBar({
  brandKit,
  onboardingComplete,
}: {
  brandKit: BrandKit;
  onboardingComplete: boolean;
}) {
  const t = useTranslations("brandKit.completeness");
  const { percent, missing } = measureBrandKitCompleteness(
    brandKit,
    onboardingComplete,
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-opseu-dark">
          {t("label", { percent })}
        </p>
        {missing.length > 0 ? (
          <p className="text-xs text-gray-600">
            {t("missingHint", {
              items: missing.map((id) => t(`items.${id}`)).join(", "),
            })}
          </p>
        ) : (
          <p className="text-xs text-emerald-800">{t("complete")}</p>
        )}
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("label", { percent })}
      >
        <div
          className="h-full rounded-full bg-opseu-blue transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
