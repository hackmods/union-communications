"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { brandSetupHref } from "@/lib/utils/brand-setup";
import { resolveLocalNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

type GuideBrandExportNudgeProps = {
  className?: string;
};

/**
 * Client island for guide export handoffs: Brand Kit setup prompt when empty,
 * or a Local N confirmation when the kit is already set. Does not personalize
 * reading copy — only export readiness.
 */
export function GuideBrandExportNudge({ className }: GuideBrandExportNudgeProps) {
  const t = useTranslations("steward101Guide.brandExport");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);

  if (!hydrated) {
    return null;
  }

  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);

  if (!themeEstablished) {
    return (
      <BrandSetupPrompt
        themeEstablished={false}
        prompt={t("setupPrompt")}
        linkLabel={t("setupLink")}
        className={className}
      />
    );
  }

  const local = resolveLocalNumber(brandKit.local.localNumber);
  const subText = brandKit.local.subText?.trim();
  const localLabel = subText
    ? t("localLabelWithSub", { number: local, subText })
    : t("localLabel", { number: local });

  return (
    <Callout tone="muted" className={cn("max-w-prose", className)}>
      <p className="font-semibold text-opseu-dark">{t("readyTitle")}</p>
      <p className="mt-2 leading-relaxed text-gray-700">
        {t("readyBody", { localLabel })}
      </p>
      <Link
        href={brandSetupHref(true)}
        className="mt-2 inline-block font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
      >
        {t("editLink")}
      </Link>
    </Callout>
  );
}
