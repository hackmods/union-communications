"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { SolidarityBadge } from "@/components/comms/campaign/SolidarityBadge";
import { pickContrastingInk } from "@/lib/utils/ink";
import { cn } from "@/lib/utils";

export type JointActionCardProps = {
  primaryColor: string;
  accentColor: string;
  title: string;
  body: string;
  actionLabel: string;
  coalitionBadge?: string;
  className?: string;
  titleFontSizePx?: number;
  bodyFontSizePx?: number;
  logoMaxHeightPx?: number;
};

/** CTA card with split local + coalition identity for joint campaigns. */
export function JointActionCard({
  primaryColor,
  accentColor,
  title,
  body,
  actionLabel,
  coalitionBadge,
  className,
  titleFontSizePx,
  bodyFontSizePx,
  logoMaxHeightPx,
}: JointActionCardProps) {
  const ink = pickContrastingInk(primaryColor);
  const accentInk = pickContrastingInk(accentColor);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-black/10 shadow-sm",
        className,
      )}
      data-export-block="joint-action-card"
    >
      <div
        className="flex items-start justify-between gap-2 px-4 py-3"
        style={{ backgroundColor: primaryColor, color: ink }}
      >
        <div
          style={
            logoMaxHeightPx
              ? { maxHeight: logoMaxHeightPx, maxWidth: logoMaxHeightPx * 2.4 }
              : undefined
          }
        >
          <BrandLogo
            backgroundColor={primaryColor}
            size={logoMaxHeightPx && logoMaxHeightPx >= 72 ? "lg" : "sm"}
            className={
              logoMaxHeightPx ? "h-auto w-auto max-h-full" : "h-7 max-w-[8rem]"
            }
          />
        </div>
        {coalitionBadge ? (
          <SolidarityBadge
            label={coalitionBadge}
            backgroundColor={accentColor}
            textColor={accentInk}
          />
        ) : null}
      </div>
      <div className="space-y-2 bg-white px-4 py-4 text-gray-900">
        <h3
          className="font-bold leading-snug"
          style={{ fontSize: titleFontSizePx ?? 18 }}
        >
          {title}
        </h3>
        <p
          className="leading-relaxed text-gray-700"
          style={{ fontSize: bodyFontSizePx ?? 14 }}
        >
          {body}
        </p>
        <p
          className="inline-flex min-h-11 items-center rounded-md px-4 py-2 font-semibold"
          style={{
            backgroundColor: accentColor,
            color: accentInk,
            fontSize: bodyFontSizePx ?? 14,
          }}
        >
          {actionLabel}
        </p>
      </div>
    </div>
  );
}
