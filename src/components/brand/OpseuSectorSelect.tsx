"use client";

import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import {
  collectionPatchForOpseuSector,
  resolveOpseuSectorId,
} from "@/lib/brand/collection-profiles";
import { listOpseuSectorsByGroup } from "@/lib/brand/opseu-sector-catalog";

type OpseuSectorSelectProps = {
  compact?: boolean;
};

/** Pick an OPSEU/SEFPO sector — loads the matching starter collection list. */
export function OpseuSectorSelect({ compact = false }: OpseuSectorSelectProps) {
  const t = useTranslations("brandKit");
  const brandKit = useBrandStore((s) => s.brandKit);
  const setBrandKit = useBrandStore((s) => s.setBrandKit);
  const sectorId =
    resolveOpseuSectorId(
      brandKit.unionPresetId,
      brandKit.opseuSectorId,
      brandKit.profiles,
    ) ?? "caat-support";
  const groups = listOpseuSectorsByGroup();

  return (
    <label className={compact ? "block space-y-1" : "block space-y-2"}>
      <span className="text-sm font-medium text-gray-700">
        {t("opseuSector.label")}
      </span>
      <select
        className="min-h-11 w-full rounded-md border border-gray-300 px-3 text-sm"
        value={sectorId}
        onChange={(e) => {
          const patch = collectionPatchForOpseuSector(
            e.target.value,
            brandKit.local.localNumber,
            brandKit.local.subText,
          );
          setBrandKit(patch);
        }}
        aria-label={t("opseuSector.label")}
      >
        {groups.map(({ group, sectors }) => (
          <optgroup key={group} label={t(`opseuSectorGroup.${group}`)}>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {t(`opseuSector.${sector.id}` as "opseuSector.ops")}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="text-xs text-gray-500">{t("opseuSector.hint")}</p>
    </label>
  );
}
