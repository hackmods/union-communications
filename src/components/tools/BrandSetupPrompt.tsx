"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { brandSetupHref } from "@/lib/utils/brand-setup";

type BrandSetupPromptProps = {
  themeEstablished: boolean;
  /** Defaults to `common.setupBrandPrompt`. */
  prompt?: string;
  /** Defaults to `common.setupBrandLink`. */
  linkLabel?: string;
  className?: string;
};

/**
 * Amber Brand Kit / onboarding nudge for public canvas tools.
 */
export function BrandSetupPrompt({
  themeEstablished,
  prompt,
  linkLabel,
  className,
}: BrandSetupPromptProps) {
  const t = useTranslations("common");
  return (
    <Callout tone="warning" className={className}>
      {prompt ?? t("setupBrandPrompt")}{" "}
      <Link
        href={brandSetupHref(themeEstablished)}
        className="font-semibold underline underline-offset-2"
      >
        {linkLabel ?? t("setupBrandLink")}
      </Link>
    </Callout>
  );
}
