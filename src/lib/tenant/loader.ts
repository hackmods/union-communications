import referenceTenant from "../../../seed/reference-tenant-b7p.json";
import {
  getLocalPatches,
  getDivisionPatches,
  getDataModulePatch,
  getEnabledModulesPatch,
  getOverlaySeeds,
  getUnitPatches,
  getCommsPresetPatch,
  getBrandThemePatch,
  getUnionHostedPlanPatch,
  getLocalHostedPlanPatch,
} from "@/lib/tenant/overlay";
import {
  UNSET_HOSTED_PLAN,
  isHostedPlansEnabled,
  resolveEffectiveHubModules,
} from "@/lib/tenant/hosted-plans";
import type {
  BargainingUnit,
  BrandDefaults,
  Division,
  GrievanceConfig,
  TenantContext,
  TenantLocal,
  TenantSeed,
} from "@/types/tenant";

const STATIC_SEEDS: TenantSeed[] = [referenceTenant as TenantSeed];

function mergeSeed(base: TenantSeed): TenantSeed {
  const unionId = base.union.id;
  const patchLocals = getLocalPatches(unionId);
  const patchDivisions = getDivisionPatches(unionId);
  const patchUnits = getUnitPatches(unionId);
  const dataModulePatch = getDataModulePatch(unionId);
  const enabledModulesPatch = getEnabledModulesPatch(unionId);
  const commsPresetPatch = getCommsPresetPatch(unionId);
  const brandThemePatch = getBrandThemePatch(unionId);
  if (
    patchLocals.length === 0 &&
    patchDivisions.length === 0 &&
    patchUnits.length === 0 &&
    dataModulePatch === undefined &&
    enabledModulesPatch === undefined &&
    commsPresetPatch === undefined &&
    brandThemePatch === undefined
  ) {
    return base;
  }

  const locals = [
    ...(base.locals && base.locals.length > 0
      ? base.locals
      : base.local
        ? [base.local]
        : []),
    ...patchLocals.filter((p) => !base.locals?.some((l) => l.id === p.id)),
  ];
  const baseDivisions = base.divisions ?? (base.division ? [base.division] : []);
  const divisions = [
    ...baseDivisions,
    ...patchDivisions.filter((row) => !baseDivisions.some((baseRow) => baseRow.id === row.id)),
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

  let enabledModules = base.union.enabledModules;
  if (enabledModulesPatch !== undefined) {
    enabledModules = enabledModulesPatch;
  } else if (dataModulePatch !== undefined) {
    enabledModules = dataModulePatch
      ? [...new Set([...base.union.enabledModules, "data" as const])]
      : base.union.enabledModules.filter((module) => module !== "data");
  }

  let brandDefaults = base.brandDefaults;
  if (commsPresetPatch !== undefined) {
    if (commsPresetPatch) {
      brandDefaults = { ...brandDefaults, commsPresetId: commsPresetPatch };
    } else if (brandDefaults.commsPresetId !== undefined) {
      brandDefaults = { ...brandDefaults };
      delete brandDefaults.commsPresetId;
    }
  }
  if (brandThemePatch !== undefined) {
    if (brandThemePatch) {
      brandDefaults = {
        ...brandDefaults,
        brandTheme: brandThemePatch,
        primaryColor: brandThemePatch.primaryColor,
        secondaryColor: brandThemePatch.secondaryColor,
        accentColor: brandThemePatch.accentColor,
      };
    } else if (brandDefaults.brandTheme !== undefined) {
      brandDefaults = { ...brandDefaults };
      delete brandDefaults.brandTheme;
    }
  }

  return {
    ...base,
    union: {
      ...base.union,
      enabledModules,
    },
    locals: dedupedLocals,
    divisions,
    bargainingUnits: dedupedUnits,
    brandDefaults,
  };
}

function isActiveSeed(seed: TenantSeed): boolean {
  return !seed.union.archivedAt;
}

/**
 * All tenant seeds including soft-archived overlay rows.
 * Prefer {@link getActiveTenantSeeds} for operator pickers and runtime context.
 */
export function getAllTenantSeeds(): TenantSeed[] {
  const staticMerged = STATIC_SEEDS.map(mergeSeed);
  const overlay = getOverlaySeeds().map(mergeSeed);
  // Overlay seeds that duplicate a static union id should not appear twice
  const staticIds = new Set(staticMerged.map((s) => s.union.id));
  return [...staticMerged, ...overlay.filter((s) => !staticIds.has(s.union.id))];
}

/** Active (non-archived) tenants for pickers, Hub context, and create dedup. */
export function getActiveTenantSeeds(): TenantSeed[] {
  return getAllTenantSeeds().filter(isActiveSeed);
}

export function getTenantByUnionSlug(slug: string): TenantSeed | undefined {
  return getActiveTenantSeeds().find((s) => s.union.slug === slug);
}

export function getTenantByUnionId(unionId: string): TenantSeed | undefined {
  // Include archived so restore / site-admin can still resolve a seed by id.
  return getAllTenantSeeds().find((s) => s.union.id === unionId);
}

export function normalizeLocals(seed: TenantSeed): TenantLocal[] {
  if (seed.locals && seed.locals.length > 0) return seed.locals;
  return seed.local ? [seed.local] : [];
}

export function normalizeDivisions(seed: TenantSeed): Division[] {
  return seed.divisions ?? (seed.division ? [seed.division] : []);
}

export function normalizeBargainingUnits(seed: TenantSeed): BargainingUnit[] {
  return seed.bargainingUnits ?? [];
}

/** Prefer the session local over `locals[0]` (seed Local 777). */
export function withActiveLocal(
  ctx: TenantContext | null,
  localId?: string | null,
): TenantContext | null {
  if (!ctx || !localId) return ctx;
  const local = ctx.locals.find((row) => row.id === localId);
  return local ? { ...ctx, local } : ctx;
}

export function getTenantContext(
  unionId: string,
  localId?: string | null,
): TenantContext | null {
  const seed = getTenantByUnionId(unionId);
  if (!seed || seed.union.archivedAt) return null;
  const locals = normalizeLocals(seed);
  const local =
    (localId ? locals.find((row) => row.id === localId) : undefined) ??
    locals[0] ??
    seed.local;
  const divisions = normalizeDivisions(seed);

  let enabledModules = seed.union.enabledModules;
  if (isHostedPlansEnabled()) {
    const unionPlan = getUnionHostedPlanPatch(unionId) ?? UNSET_HOSTED_PLAN;
    // Only apply a local override when the caller named a localId.
    // Do not use the fallback locals[0] plan for union-wide lookups.
    const localPlan =
      localId && local?.id
        ? (getLocalHostedPlanPatch(local.id) ?? UNSET_HOSTED_PLAN)
        : UNSET_HOSTED_PLAN;
    enabledModules = resolveEffectiveHubModules({
      unionModules: seed.union.enabledModules,
      unionPlan,
      localPlan,
      enforcementEnabled: true,
    });
  }

  return {
    union: { ...seed.union, enabledModules },
    division: local
      ? divisions.find((row) => row.id === local.divisionId)
      : divisions[0],
    divisions,
    local,
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

export function findLocalByNumber(
  unionId: string,
  localNumber: string,
): TenantLocal | undefined {
  const n = localNumber.trim();
  if (!n) return undefined;
  return getTenantContext(unionId)?.locals.find(
    (l) => l.localNumber.trim() === n,
  );
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
      primaryColor: "#E87722",
      secondaryColor: "#FFFFFF",
      accentColor: "#1A1A1A",
      useOfficialLogo: false,
      assetPackPath: "",
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
