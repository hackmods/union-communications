"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { measureBrandKitCompleteness } from "@/lib/brand/brand-kit-completeness";
import type { BrandKit } from "@/types/entities";

export function BrandKitCompletenessBar({
  brandKit,
  hydrated,
}: {
  brandKit: BrandKit;
  hydrated: boolean;
}) {
  const t = useTranslations("brandKit.completeness");
  const { essentialReady, essentialMissing, optionalConfigured } =
    measureBrandKitCompleteness(brandKit);
  const nextStep = essentialMissing[0];
  const nextStepHref = nextStep === "localNumber"
    ? "#brand-local-number"
    : nextStep === "colours"
      ? "#brand-colours"
      : "#brand-logo";

  return (
    <Card density="compact" className="px-4 py-3 sm:px-5 md:py-3">
      {!hydrated ? (
        <p className="text-sm text-slate-600">{t("loading")}</p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
          <div>
            <p className="text-sm font-semibold text-opseu-dark">
              {essentialReady ? t("ready") : t("needsIdentity")}
            </p>
            {essentialMissing.length > 0 ? (
              <>
                <p className="mt-0.5 text-xs text-slate-600">
                  {t("missingHint", {
                    items: essentialMissing.map((id) => t(`items.${id}`)).join(", "),
                  })}
                </p>
                <a href={nextStepHref} className="mt-1 inline-block text-sm font-semibold text-opseu-blue underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opseu-blue">
                  {t("nextStep", { item: t(`items.${nextStep}`) })}
                </a>
              </>
            ) : (
              <p className="mt-0.5 text-xs text-slate-600">
                {t("complete")}
              </p>
            )}
          </div>
          <p className="text-xs text-slate-600">
            {t("optionalConfigured", { count: optionalConfigured })}
          </p>
        </div>
      )}
    </Card>
  );
}
