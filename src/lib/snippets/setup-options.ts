/**
 * Hub local-setup options that bridge Brand Kit presets → CA snippet libraries.
 * Codes match `defaultLibraryForBargainingUnitCode`.
 */

import { UNION_PRESETS } from "@/lib/constants/unionPresets";
import {
  UNION_COLLECTION_CATALOGS,
  type CollectionProfileTemplate,
} from "@/lib/brand/collection-profile-catalog";
import { OPSEU_SECTOR_CATALOG } from "@/lib/brand/opseu-sector-catalog";

export type SnippetSetupCollectionOption = {
  code: string;
  name: string;
};

/** Presets offered during Hub local setup (Brand Kit catalog ids). */
export function snippetSetupUnionPresets(): { id: string; name: string }[] {
  return UNION_PRESETS.map((p) => ({ id: p.id, name: p.name }));
}

/**
 * Collection options for a Brand Kit union preset.
 * OPSEU exposes college CA-relevant units (support FT/PT + academic).
 */
export function snippetSetupCollectionsForPreset(
  unionPresetId: string,
  opseuSectorId?: string,
): SnippetSetupCollectionOption[] {
  const id = unionPresetId.trim().toLowerCase();
  if (id === "opseu") {
    const sector =
      OPSEU_SECTOR_CATALOG[opseuSectorId ?? "caat-support"] ??
      OPSEU_SECTOR_CATALOG["caat-support"];
    // Always offer the college CA units officers cite most — not only the active sector.
    const college: SnippetSetupCollectionOption[] = [
      { code: "support", name: "College Support" },
      { code: "ft", name: "College Support Full-Time" },
      { code: "pt", name: "College Support Part-Time" },
      { code: "academic", name: "College Academic / Faculty" },
      { code: "partial-load", name: "Partial-Load Faculty" },
    ];
    if (sector && sector.id !== "caat-support" && sector.id !== "caat-academic") {
      return [
        ...templatesToOptions(sector.profiles),
        ...college,
      ].filter(
        (opt, i, arr) => arr.findIndex((o) => o.code === opt.code) === i,
      );
    }
    return college;
  }

  const catalog =
    UNION_COLLECTION_CATALOGS[
      id as keyof typeof UNION_COLLECTION_CATALOGS
    ];
  if (catalog) return templatesToOptions(catalog.profiles);
  return [{ code: "default", name: "Default collection" }];
}

function templatesToOptions(
  profiles: CollectionProfileTemplate[],
): SnippetSetupCollectionOption[] {
  return profiles
    .filter((p) => p.bargainingUnitCode && p.bargainingUnitCode !== "other")
    .map((p) => ({ code: p.bargainingUnitCode, name: p.label }));
}
