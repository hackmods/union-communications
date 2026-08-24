"use client";

import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import {
  applyIdentityPack,
  colorsForCampaignPlate,
  colorsMatchIdentityPack,
  identityPackGalleryTiles,
  identityPacksFor,
  lockupOnPlateFor,
  resolveCampaignPlateForKit,
  resolveIdentityPackForKit,
  type CampaignPlate,
  type IdentityCampaignPlate,
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

function tileTitle(
  t: (key: string) => string,
  pack: IdentityPack,
  plate: IdentityCampaignPlate | null,
): string {
  const packKey = packNameKey(pack.id);
  if (plate) {
    const plateTitleKey = `packs.${packKey}.plates.${plate.labelKey}.name`;
    const plateTitle = t(plateTitleKey);
    if (plateTitle !== plateTitleKey) return plateTitle;
    return `${t(`packs.${packKey}.name`)} — ${t(`plates.${plate.labelKey}`)}`;
  }
  return t(`packs.${packKey}.name`);
}

function tileDescription(
  t: (key: string) => string,
  pack: IdentityPack,
  plate: IdentityCampaignPlate | null,
): string {
  const packKey = packNameKey(pack.id);
  if (plate) {
    const plateDescKey = `packs.${packKey}.plates.${plate.labelKey}.description`;
    const plateDesc = t(plateDescKey);
    if (plateDesc !== plateDescKey) return plateDesc;
  }
  return t(`packs.${packKey}.description`);
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
  const tiles = identityPackGalleryTiles(packs);

  if (tiles.length < 2) return null;

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
        className="flex min-w-0 max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-3"
        role="radiogroup"
        aria-label={t("label")}
        data-testid="identity-pack-gallery"
      >
        {tiles.map(({ pack, plate, key }) => {
          const selected =
            active?.id === pack.id &&
            (plate ? activePlate === plate.id : true);
          const colors = plate
            ? colorsForCampaignPlate(pack, plate.id)
            : pack.colors;
          const previewSrc =
            lockupOnPlateFor(pack, plate?.id) ?? pack.logos.lockup;
          const plateFill = plate
            ? colors.primaryColor
            : pack.logos.lockupOnDark
              ? pack.colors.primaryColor
              : "#FFFFFF";
          const onDarkPreview = Boolean(
            lockupOnPlateFor(pack, plate?.id) || pack.logos.lockupOnDark,
          );
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectPack(pack, plate?.id)}
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
                        plateFill === "#FFFFFF"
                          ? pack.colors.primaryColor
                          : plateFill,
                      ["--tw-ring-color" as string]:
                        plateFill === "#FFFFFF"
                          ? pack.colors.primaryColor
                          : plateFill,
                    }
                  : undefined
              }
            >
              <span
                className="flex h-24 w-full min-w-0 items-center justify-center overflow-hidden px-2 py-2 sm:h-28 sm:px-3"
                style={{ backgroundColor: plateFill }}
              >
                <SafeLogoImage
                  src={previewSrc}
                  alt=""
                  width={220}
                  height={72}
                  className="h-[4.25rem] w-auto max-w-full object-contain sm:h-[4.75rem]"
                  onDark={onDarkPreview}
                />
              </span>
              <span className="block min-w-0 space-y-2 border-t border-black/5 bg-white p-3">
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 font-semibold break-words text-gray-900">
                    {tileTitle(t, pack, plate)}
                  </span>
                  {selected ? (
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{
                        backgroundColor:
                          plateFill === "#FFFFFF"
                            ? pack.colors.primaryColor
                            : plateFill,
                      }}
                      aria-hidden
                    >
                      ✓
                    </span>
                  ) : null}
                </span>
                <span className="block text-xs break-words text-gray-600">
                  {tileDescription(t, pack, plate)}
                </span>
                <span className="flex gap-1.5" aria-hidden>
                  {(
                    [
                      colors.primaryColor,
                      colors.accentColor,
                      colors.secondaryColor,
                    ] as const
                  ).map((hex) => (
                    <span
                      key={`${key}-${hex}`}
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

      {active && !colorsMatchIdentityPack(brandKit, active) ? (
        <p className="text-xs text-gray-600">
          {t("coloursDiffer")}{" "}
          <button
            type="button"
            className="font-medium text-opseu-blue underline underline-offset-2"
            onClick={() => selectPack(active, activePlate || undefined)}
          >
            {t("resetToPack")}
          </button>
        </p>
      ) : null}
    </div>
  );
}
