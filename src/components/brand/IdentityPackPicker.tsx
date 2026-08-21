"use client";

import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import {
  applyIdentityPack,
  colorsMatchIdentityPack,
  identityPacksFor,
  resolveIdentityPackForKit,
  type IdentityPack,
} from "@/lib/brand/identity-packs";
import { resolveOpseuSectorId } from "@/lib/brand/collection-profiles";
import { cn } from "@/lib/utils";

type IdentityPackPickerProps = {
  compact?: boolean;
};

function packNameKey(packId: string): "opseu-national" | "opseu-caat-s" {
  return packId === "opseu-caat-s" ? "opseu-caat-s" : "opseu-national";
}

/** Visual Look gallery — collective colours + official logos (not collection text). */
export function IdentityPackPicker({ compact = false }: IdentityPackPickerProps) {
  const t = useTranslations("brandKit.identityPack");
  const brandKit = useBrandStore((s) => s.brandKit);
  const setBrandKit = useBrandStore((s) => s.setBrandKit);

  const sectorId = resolveOpseuSectorId(
    brandKit.unionPresetId,
    brandKit.opseuSectorId,
    brandKit.profiles,
  );
  const packs = identityPacksFor(
    brandKit.unionPresetId,
    sectorId,
    brandKit.identityPackId,
  );

  if (packs.length < 2) return null;

  const active =
    resolveIdentityPackForKit(brandKit) ??
    packs.find((p) => p.id === brandKit.identityPackId) ??
    packs[0];

  const selectPack = (pack: IdentityPack) => {
    setBrandKit(applyIdentityPack(pack));
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div>
        <p className="text-sm font-medium text-gray-700">{t("label")}</p>
        <p className="mt-1 text-xs text-gray-500">{t("hint")}</p>
      </div>

      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible md:pb-0"
        role="radiogroup"
        aria-label={t("label")}
      >
        {packs.map((pack) => {
          const selected = active?.id === pack.id;
          const hasReverse = Boolean(pack.logos.lockupOnDark);
          const previewSrc = hasReverse
            ? pack.logos.lockupOnDark!
            : pack.logos.lockup;
          const plate = hasReverse ? pack.colors.primaryColor : "#FFFFFF";
          return (
            <button
              key={pack.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectPack(pack)}
              className={cn(
                "min-w-[14rem] shrink-0 snap-start overflow-hidden rounded-xl border text-left transition-shadow md:min-w-0",
                selected
                  ? "ring-2 ring-offset-2"
                  : "border-gray-200 hover:border-gray-300",
              )}
              style={
                selected
                  ? {
                      borderColor: pack.colors.primaryColor,
                      ["--tw-ring-color" as string]: pack.colors.primaryColor,
                    }
                  : undefined
              }
            >
              <span
                className="flex h-24 items-center justify-center px-2 py-2 sm:h-28 sm:px-3"
                style={{ backgroundColor: plate }}
              >
                <SafeLogoImage
                  src={previewSrc}
                  alt=""
                  width={220}
                  height={72}
                  className="h-[4.25rem] w-auto max-w-[92%] object-contain sm:h-[4.75rem]"
                  onDark={hasReverse}
                />
              </span>
              <span className="block space-y-2 border-t border-black/5 bg-white p-3">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900">
                    {t(`packs.${packNameKey(pack.id)}.name`)}
                  </span>
                  {selected ? (
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: pack.colors.primaryColor }}
                      aria-hidden
                    >
                      ✓
                    </span>
                  ) : null}
                </span>
                <span className="block text-xs text-gray-600">
                  {t(`packs.${packNameKey(pack.id)}.description`)}
                </span>
                <span className="flex gap-1.5" aria-hidden>
                  {(
                    [
                      pack.colors.primaryColor,
                      pack.colors.accentColor,
                      pack.colors.secondaryColor,
                    ] as const
                  ).map((hex) => (
                    <span
                      key={hex}
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {active && !colorsMatchIdentityPack(brandKit, active) ? (
        <p className="text-xs text-gray-600">
          {t("coloursDiffer")}{" "}
          <button
            type="button"
            className="font-medium text-opseu-blue underline underline-offset-2"
            onClick={() => selectPack(active)}
          >
            {t("resetToPack")}
          </button>
        </p>
      ) : null}
    </div>
  );
}
