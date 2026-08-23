"use client";

import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import {
  applyIdentityPack,
  colorsMatchIdentityPack,
  identityPacksFor,
  packOffersCampaignPlates,
  resolveCampaignPlateForKit,
  resolveIdentityPackForKit,
  type CampaignPlate,
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

  const selectPack = (pack: IdentityPack, plate?: CampaignPlate) => {
    setBrandKit(applyIdentityPack(pack, plate));
  };

  const activePlate = resolveCampaignPlateForKit(brandKit);

  return (
    <div className={cn("min-w-0", compact ? "space-y-2" : "space-y-3")}>
      <div>
        <p className="text-sm font-medium text-gray-700">{t("label")}</p>
        <p className="mt-1 text-xs text-gray-500">{t("hint")}</p>
      </div>

      <div
        className="flex min-w-0 max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 md:grid md:grid-cols-2 md:overflow-visible md:pb-0"
        role="radiogroup"
        aria-label={t("label")}
        data-testid="identity-pack-gallery"
      >
        {packs.map((pack) => {
          const selected = active?.id === pack.id;
          const previewPlate =
            selected && packOffersCampaignPlates(pack) ? activePlate : "primary";
          const previewOnAccent =
            previewPlate === "accent" && Boolean(pack.logos.lockupOnAccent);
          const previewSrc = previewOnAccent
            ? pack.logos.lockupOnAccent!
            : pack.logos.lockupOnDark
              ? pack.logos.lockupOnDark
              : pack.logos.lockup;
          const plate = previewOnAccent
            ? pack.colors.accentColor
            : pack.logos.lockupOnDark
              ? pack.colors.primaryColor
              : "#FFFFFF";
          return (
            <button
              key={pack.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectPack(pack)}
              className={cn(
                // Cap width so long CAAT-S copy wraps instead of sizing the
                // flex item to max-content and blowing out the Brand Kit card.
                "w-[min(18rem,100%)] max-w-full min-w-0 shrink-0 snap-start overflow-hidden rounded-xl border text-left transition-shadow md:w-auto",
                selected
                  ? "ring-2 ring-offset-2"
                  : "border-gray-200 hover:border-gray-300",
              )}
              style={
                selected
                  ? {
                      borderColor:
                        plate === "#FFFFFF"
                          ? pack.colors.primaryColor
                          : plate,
                      ["--tw-ring-color" as string]:
                        plate === "#FFFFFF"
                          ? pack.colors.primaryColor
                          : plate,
                    }
                  : undefined
              }
            >
              <span
                className="flex h-24 w-full min-w-0 items-center justify-center overflow-hidden px-2 py-2 sm:h-28 sm:px-3"
                style={{ backgroundColor: plate }}
              >
                <SafeLogoImage
                  src={previewSrc}
                  alt=""
                  width={220}
                  height={72}
                  className="h-[4.25rem] w-auto max-w-full object-contain sm:h-[4.75rem]"
                  onDark={Boolean(
                    pack.logos.lockupOnDark || pack.logos.lockupOnAccent,
                  )}
                />
              </span>
              <span className="block min-w-0 space-y-2 border-t border-black/5 bg-white p-3">
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 font-semibold break-words text-gray-900">
                    {t(`packs.${packNameKey(pack.id)}.name`)}
                  </span>
                  {selected ? (
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{
                        backgroundColor:
                          plate === "#FFFFFF"
                            ? pack.colors.primaryColor
                            : plate,
                      }}
                      aria-hidden
                    >
                      ✓
                    </span>
                  ) : null}
                </span>
                <span className="block text-xs break-words text-gray-600">
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
                      className="h-4 w-4 shrink-0 rounded-full border border-black/10"
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

      {active && packOffersCampaignPlates(active) ? (
        <div
          className="flex min-w-0 flex-wrap gap-2"
          role="radiogroup"
          aria-label={t("platesLabel")}
          data-testid="campaign-plate-picker"
        >
          {active.campaignPlates.map((plate) => {
            const selected = activePlate === plate;
            const swatch =
              plate === "accent"
                ? active.colors.accentColor
                : active.colors.primaryColor;
            return (
              <button
                key={plate}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectPack(active, plate)}
                className={cn(
                  "inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-shadow",
                  selected
                    ? "ring-2 ring-offset-2"
                    : "border-gray-200 text-gray-700 hover:border-gray-300",
                )}
                style={
                  selected
                    ? {
                        borderColor: swatch,
                        ["--tw-ring-color" as string]: swatch,
                      }
                    : undefined
                }
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: swatch }}
                  aria-hidden
                />
                {t(`plates.${plate}`)}
              </button>
            );
          })}
        </div>
      ) : null}

      {active && !colorsMatchIdentityPack(brandKit, active) ? (
        <p className="text-xs text-gray-600">
          {t("coloursDiffer")}{" "}
          <button
            type="button"
            className="font-medium text-opseu-blue underline underline-offset-2"
            onClick={() => selectPack(active, activePlate)}
          >
            {t("resetToPack")}
          </button>
        </p>
      ) : null}
    </div>
  );
}
