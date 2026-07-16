"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { cn } from "@/lib/utils";
import {
  RESIZER_FORMATS,
  type ResizerFormat,
  type ResizerFormatId,
} from "@/lib/constants/resizer-formats";

type PlatformGroupId = "facebook" | "instagram" | "youtube";

const PLATFORM_GROUPS: readonly {
  id: PlatformGroupId;
  labelKey: "groupFacebook" | "groupInstagram" | "groupYoutube";
  formatIds: readonly Exclude<ResizerFormatId, "custom">[];
}[] = [
  {
    id: "facebook",
    labelKey: "groupFacebook",
    formatIds: ["facebookCover", "facebookPost"],
  },
  {
    id: "instagram",
    labelKey: "groupInstagram",
    formatIds: ["instagramSquare", "instagramStory"],
  },
  {
    id: "youtube",
    labelKey: "groupYoutube",
    formatIds: ["youtubeBanner"],
  },
];

function tileWidthClass(id: Exclude<ResizerFormatId, "custom">): string {
  switch (id) {
    case "instagramStory":
      return "w-full max-w-[9.5rem] sm:max-w-[11rem]";
    case "instagramSquare":
      return "w-full max-w-[15rem] sm:max-w-[17rem]";
    case "facebookPost":
      return "w-full max-w-[22rem]";
    case "facebookCover":
      return "w-full";
    case "youtubeBanner":
      return "w-full max-w-3xl";
  }
}

function groupBodyClass(id: PlatformGroupId): string {
  switch (id) {
    case "instagram":
      return "flex flex-wrap items-start gap-4 sm:gap-6";
    case "facebook":
      return "flex flex-col gap-4";
    case "youtube":
      return "flex flex-col gap-4";
  }
}

type SocialAssetsGalleryProps = {
  selectedId: ResizerFormatId;
  onSelect: (id: Exclude<ResizerFormatId, "custom">) => void;
  renderFrame: (format: ResizerFormat) => ReactNode;
  safeZoneOverlay?: ReactNode;
};

export function SocialAssetsGallery({
  selectedId,
  onSelect,
  renderFrame,
  safeZoneOverlay,
}: SocialAssetsGalleryProps) {
  const t = useTranslations("resizer");

  return (
    <section className="space-y-5" aria-labelledby="resizer-social-assets-heading">
      <div className="space-y-2">
        <h2
          id="resizer-social-assets-heading"
          className="text-lg font-semibold text-opseu-dark md:text-xl"
        >
          {t("allFormats")}
        </h2>
        <Callout tone="muted" className="max-w-2xl">
          {t("allFormatsHint")}
        </Callout>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        {PLATFORM_GROUPS.map((group) => (
          <div
            key={group.id}
            className={cn(
              "rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5",
              group.id === "youtube" && "lg:col-span-2",
            )}
          >
            <h3 className="text-sm font-medium text-gray-700">
              {t(group.labelKey)}
            </h3>
            <div className={cn("mt-3", groupBodyClass(group.id))}>
              {group.formatIds.map((formatId) => {
                const format = RESIZER_FORMATS[formatId];
                const selected = selectedId === formatId;
                return (
                  <button
                    key={formatId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(formatId)}
                    className={cn(
                      "group/tile text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40 focus-visible:ring-offset-2",
                      tileWidthClass(formatId),
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-medium text-opseu-dark">
                        {t(format.labelKey)}
                      </span>
                      <span className="font-mono text-xs text-gray-500">
                        {format.width}×{format.height}
                      </span>
                      {selected ? (
                        <span className="rounded bg-opseu-blue/10 px-1.5 py-0.5 text-xs font-semibold text-opseu-blue">
                          {t("formatEditing")}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-lg border bg-gray-100 shadow-sm transition-[box-shadow,ring] duration-150",
                        selected
                          ? "ring-2 ring-opseu-blue ring-offset-2"
                          : "group-hover/tile:shadow-md",
                      )}
                    >
                      {renderFrame(format)}
                      {safeZoneOverlay}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
