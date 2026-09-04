/**
 * Typed facade over UnionOps brand registries — Looks, union presets, and
 * sector catalogs. Source of truth stays in each module; this file is for
 * discoverability and coalition/campaign helpers only.
 *
 * Skipped by design (see docs/modules/COMMS.md § Multi-brand architecture):
 * - Parallel brand.config.ts token store
 * - Root .theme-* CSS class switcher (BrandProvider + identityPackId)
 * - Hub bargaining unit ↔ collection profile merge
 */

import {
  getIdentityPack,
  identityPacksFor,
  type IdentityPack,
} from "@/lib/brand/identity-packs";
import { OPSEU_SECTOR_CATALOG } from "@/lib/brand/opseu-sector-catalog";
import { UNION_PRESETS } from "@/lib/constants/unionPresets";

export {
  IDENTITY_PACKS,
  getIdentityPack,
  identityPacksFor,
  OPSEU_CAAT_A_PACK_ID,
  OPSEU_CAAT_S_PACK_ID,
  OPSEU_NATIONAL_PACK_ID,
} from "@/lib/brand/identity-packs";

export { UNION_PRESETS, type UnionBranding } from "@/lib/constants/unionPresets";

export type BrandRegistryLook = IdentityPack;

/** Looks offered for a union preset and optional OPSEU sector. */
export function listLooksForContext(
  unionPresetId: string | undefined,
  sectorId?: string,
  savedPackId?: string,
): IdentityPack[] {
  return identityPacksFor(unionPresetId, sectorId, savedPackId);
}

export function resolveLook(id: string | undefined): IdentityPack | undefined {
  return getIdentityPack(id);
}

export function listUnionPresetIds(): string[] {
  return UNION_PRESETS.map((p) => p.id);
}

export function listOpseuSectorIds(): string[] {
  return Object.keys(OPSEU_SECTOR_CATALOG);
}

/** Pair a local Look with a coalition Look for joint bargaining canvases. */
export type DualIdentityLookPair = {
  local: IdentityPack;
  coalition: IdentityPack;
};

export function resolveDualIdentityLooks(
  localPackId: string,
  coalitionPackId: string,
): DualIdentityLookPair | null {
  const local = getIdentityPack(localPackId);
  const coalition = getIdentityPack(coalitionPackId);
  if (!local || !coalition) return null;
  if (local.unionPresetId !== coalition.unionPresetId) return null;
  return { local, coalition };
}
