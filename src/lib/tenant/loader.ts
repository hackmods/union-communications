import referenceTenant from "../../../seed/reference-tenant-opseu-caat.json";
import type {
  BargainingUnit,
  BrandDefaults,
  GrievanceConfig,
  TenantContext,
  TenantLocal,
  TenantSeed,
} from "@/types/tenant";

const SEEDS: TenantSeed[] = [referenceTenant as TenantSeed];

export function getAllTenantSeeds(): TenantSeed[] {
  return SEEDS;
}

export function getTenantByUnionSlug(slug: string): TenantSeed | undefined {
  return SEEDS.find((s) => s.union.slug === slug);
}

export function getTenantByUnionId(unionId: string): TenantSeed | undefined {
  return SEEDS.find((s) => s.union.id === unionId);
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

export function getDefaultBrandDefaults() {
  const seed = SEEDS[0];
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
