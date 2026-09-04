"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { SolidarityBadge } from "@/components/comms/campaign/SolidarityBadge";
import { pickContrastingInk } from "@/lib/utils/ink";
import { cn } from "@/lib/utils";

export type BargainingBannerProps = {
  /** Local unit primary field */
  primaryColor: string;
  /** Coalition / parent union accent stripe */
  accentColor: string;
  headline: string;
  subline?: string;
  /** Optional second line under logos */
  coalitionLabel?: string;
  className?: string;
};

/** Dual-identity header strip for joint bargaining graphics. */
export function BargainingBanner({
  primaryColor,
  accentColor,
  headline,
  subline,
  coalitionLabel,
  className,
}: BargainingBannerProps) {
  const ink = pickContrastingInk(primaryColor);
  const accentInk = pickContrastingInk(accentColor);

  return (
    <div
      className={cn("overflow-hidden rounded-md border border-black/10", className)}
      data-export-block="bargaining-banner"
    >
      <div
        className="px-4 py-3"
        style={{ backgroundColor: primaryColor, color: ink }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BrandLogo backgroundColor={primaryColor} className="h-8 max-w-[9rem]" />
          {coalitionLabel ? (
            <SolidarityBadge
              label={coalitionLabel}
              backgroundColor={accentColor}
              textColor={accentInk}
            />
          ) : null}
        </div>
        <p className="mt-2 text-lg font-bold leading-snug">{headline}</p>
        {subline ? (
          <p className="mt-1 text-sm opacity-90">{subline}</p>
        ) : null}
      </div>
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
    </div>
  );
}
