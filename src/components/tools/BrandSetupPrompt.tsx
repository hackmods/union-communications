"use client";

import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { brandSetupHref } from "@/lib/utils/brand-setup";

type BrandSetupPromptProps = {
  themeEstablished: boolean;
  prompt: string;
  linkLabel: string;
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
  return (
    <Callout tone="warning" className={className}>
      {prompt}{" "}
      <Link
        href={brandSetupHref(themeEstablished)}
        className="font-semibold underline underline-offset-2"
      >
        {linkLabel}
      </Link>
    </Callout>
  );
}
