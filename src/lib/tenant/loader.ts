import referenceTenant from "../../../seed/reference-tenant-opseu-caat.json";
import {
  getLocalPatches,
  getOverlaySeeds,
  getUnitPatches,
} from "@/lib/tenant/overlay";
import type {
  BargainingUnit,
  BrandDefaults,
  GrievanceConfig,
  TenantContext,
  TenantLocal,
  TenantSeed,
} from "@/types/tenant";

const STATIC_SEEDS: TenantSeed[] = [referenceTenant as TenantSeed];

function mergeSeed(base: TenantSeed): TenantSeed {
  const unionId = base.union.id;
  const patchLocals = getLocalPatches(unionId);
  const patchUnits = getUnitPatches(unionId);
  if (patchLocals.length === 0 && patchUnits.length === 0) return base;

  const locals = [
    ...(base.locals && base.locals.length > 0
      ? base.locals
      : base.local
        ? [base.local]
        : []),
    ...patchLocals.filter((p) => !base.locals?.some((l) => l.id === p.id)),
  ];
  // Deduplicate by id when overlay seed already includes patches
  const localIds = new Set<string>();
  const dedupedLocals = locals.filter((l) => {
    if (localIds.has(l.id)) return false;
    localIds.add(l.id);
    return true;
  });

  const units = [
    ...(base.bargainingUnits ?? []),
    ...patchUnits.filter(
      (p) => !(base.bargainingUnits ?? []).some((u) => u.id === p.id),
    ),
  ];
  const unitIds = new Set<string>();
  const dedupedUnits = units.filter((u) => {
    if (unitIds.has(u.id)) return false;
    unitIds.add(u.id);
    return true;
  });

  return {
    ...base,
    locals: dedupedLocals,
    bargainingUnits: dedupedUnits,
  };
}

export function getAllTenantSeeds(): TenantSeed[] {
  const staticMerged = STATIC_SEEDS.map(mergeSeed);
  const overlay = getOverlaySeeds().map(mergeSeed);
  // Overlay seeds that duplicate a static union id should not appear twice
  const staticIds = new Set(staticMerged.map((s) => s.union.id));
  return [...staticMerged, ...overlay.filter((s) => !staticIds.has(s.union.id))];
}

export function getTenantByUnionSlug(slug: string): TenantSeed | undefined {
  return getAllTenantSeeds().find((s) => s.union.slug === slug);
}

export function getTenantByUnionId(unionId: string): TenantSeed | undefined {
  return getAllTenantSeeds().find((s) => s.union.id === unionId);
}

export function normalizeLocals(seed: TenantSeed): TenantLocal[] {
  if (seed.locals && seed.locals.length > 0) return seed.locals;
  return seed.local ? [seed.local] : [];
}

export function normalizeBargainingUnits(seed: TenantSeed): BargainingUnit[] {
  return seed.bargainingUnits ?? [];
}

export function getTenantContext(unionId: string): TenantContext | null {
  const seed = getTenantByUnionId(unionId);
  if (!seed) return null;
  const locals = normalizeLocals(seed);
  return {
    union: seed.union,
    division: seed.division,
    local: locals[0] ?? seed.local,
    locals,
    bargainingUnits: normalizeBargainingUnits(seed),
    brandDefaults: seed.brandDefaults,
    grievanceConfig: seed.grievanceConfig,
  };
}

export function getLocalById(
  unionId: string,
  localId: string,
): TenantLocal | undefined {
  return getTenantContext(unionId)?.locals.find((l) => l.id === localId);
}

export function getBargainingUnitById(
  unionId: string,
  bargainingUnitId: string,
): BargainingUnit | undefined {
  return getTenantContext(unionId)?.bargainingUnits.find(
    (b) => b.id === bargainingUnitId,
  );
}

export function listBargainingUnitsForLocal(
  unionId: string,
  localId: string,
): BargainingUnit[] {
  return (
    getTenantContext(unionId)?.bargainingUnits.filter(
      (b) => b.localId === localId,
    ) ?? []
  );
}

/**
 * Resolve CA steps: collection → union fallback.
 * Collection configs are the primary place for FT/PT deadline differences.
 */
export function resolveGrievanceConfig(
  unionId: string,
  options?: { bargainingUnitId?: string; localId?: string },
): GrievanceConfig | undefined {
  const ctx = getTenantContext(unionId);
  if (!ctx) return undefined;

  if (options?.bargainingUnitId) {
    const unit = ctx.bargainingUnits.find(
      (b) => b.id === options.bargainingUnitId,
    );
    if (unit?.grievanceConfig) return unit.grievanceConfig;
  }

  if (options?.localId) {
    const localUnits = ctx.bargainingUnits.filter(
      (b) => b.localId === options.localId,
    );
    if (localUnits.length === 1 && localUnits[0].grievanceConfig) {
      return localUnits[0].grievanceConfig;
    }
  }

  return ctx.grievanceConfig;
}

/**
 * Asset-pack defaults from the first *static* seed (reference tenant).
 * Not used when provisioning new unions — see `neutralBrandDefaultsForNewTenant`.
 */
export function getDefaultBrandDefaults() {
  const seed = STATIC_SEEDS[0];
  return (
    seed?.brandDefaults ?? {
      primaryColor: "#C2410C",
      secondaryColor: "#FFFFFF",
      accentColor: "#9A3412",
      useOfficialLogo: false,
      assetPackPath: "/assets/caat-opseu/",
    }
  );
}

/**
 * Membership application URLs from a tenant seed matched by union slug
 * (same id as Comms union presets, e.g. `"opseu"`). Empty when no seed
 * or the seed has no `brandDefaults.membershipUrls` — never used as a
 * platform-wide Brand Kit default.
 */
export function getSeedMembershipUrlsForPreset(presetId: string): NonNullable<
  BrandDefaults["membershipUrls"]
> {
  const seed = getTenantByUnionSlug(presetId);
  const rows = seed?.brandDefaults?.membershipUrls ?? [];
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    url: row.url,
    audience: row.audience,
    primary: row.primary,
  }));
}
