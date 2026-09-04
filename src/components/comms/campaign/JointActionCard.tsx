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
        <BrandLogo backgroundColor={primaryColor} className="h-7 max-w-[8rem]" />
        {coalitionBadge ? (
          <SolidarityBadge
            label={coalitionBadge}
            backgroundColor={accentColor}
            textColor={accentInk}
          />
        ) : null}
      </div>
      <div className="space-y-2 bg-white px-4 py-4 text-gray-900">
        <h3 className="text-lg font-bold leading-snug">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-700">{body}</p>
        <p
          className="inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: accentColor, color: accentInk }}
        >
          {actionLabel}
        </p>
      </div>
    </div>
  );
}
