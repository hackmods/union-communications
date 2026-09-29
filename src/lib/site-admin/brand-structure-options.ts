/**
 * Brand Kit → Hub structure option catalogs for Site Admin.
 *
 * Bargaining collectives (Division) align to OPSEU sector / suggested division
 * labels when the bound Comms preset is `opseu`. Collections (BargainingUnit)
 * reuse the snippet/setup collection catalog for the bound preset.
 *
 * Brand Kit never creates Hub tenancy — these are suggestion dropdowns only.
 */

import { OPSEU_SECTOR_CATALOG } from "@/lib/brand/opseu-sector-catalog";
import { OPSEU_SUGGESTED_DIVISION_LABELS } from "@/lib/customization/opseu-pilot";
import { snippetSetupCollectionsForPreset } from "@/lib/snippets/setup-options";

export type BrandStructureOption = {
  code: string;
  name: string;
  /** Catalog provenance for UI hints. */
  source: "sector" | "division" | "collection";
};

/**
 * Suggested bargaining-collective {code,name} pairs for a Comms preset.
 * Empty for presets without a collective catalog (operator uses Custom).
 */
export function brandCollectiveOptionsForPreset(
  presetId: string | null | undefined,
): BrandStructureOption[] {
  const id = (presetId ?? "").trim().toLowerCase();
  if (id !== "opseu") return [];

  const fromSectors: BrandStructureOption[] = Object.values(
    OPSEU_SECTOR_CATALOG,
  )
    .filter((sector) => sector.id !== "other")
    .map((sector) => ({
      code: sector.id,
      name: sector.label,
      source: "sector" as const,
    }));

  const fromDivisions: BrandStructureOption[] =
    OPSEU_SUGGESTED_DIVISION_LABELS.map((row) => ({
      code: row.code,
      name: row.en,
      source: "division" as const,
    }));

  const merged = [...fromDivisions, ...fromSectors];
  return merged.filter(
    (opt, index, arr) =>
      arr.findIndex((other) => other.code === opt.code) === index,
  );
}

/** Suggested collection {code,name} pairs for a Comms preset. */
export function brandCollectionOptionsForPreset(
  presetId: string | null | undefined,
): BrandStructureOption[] {
  const id = (presetId ?? "").trim().toLowerCase();
  if (!id || id === "other") return [];
  return snippetSetupCollectionsForPreset(id).map((row) => ({
    code: row.code,
    name: row.name,
    source: "collection" as const,
  }));
}
