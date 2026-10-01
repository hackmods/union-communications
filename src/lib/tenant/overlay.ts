import { resolveHostBrandWithOverlay } from "@/lib/brand/host-brand-overlay";
import { PRESIDENT_OVERLAY_MODULES } from "@/lib/president/module-catalog";
import type {
  PortalSurfaceId,
  PresidentRoleToolId,
} from "@/lib/president/module-catalog";
import type { HostedPlanRecord } from "@/lib/tenant/hosted-plans";
import type {
  BargainingUnit,
  BrandDefaults,
  Division,
  HubModule,
  TenantLocal,
  TenantSeed,
} from "@/types/tenant";

/**
 * In-memory tenant overlay merged by the loader.
 * Survives for the process lifetime only (same durability model as memory adapters).
 * New unions never clone the OPSEU reference seed — brand defaults come from host brand.
 *
 * Client/Edge-safe: resolve host brand via host-brand-overlay only.
 * Importing host-brand-store (or any DB client) pulls Node postgres into
 * client / middleware / OG image graphs and breaks Turbopack builds.
 */
const overlaySeeds = new Map<string, TenantSeed>();
/** Locals / collections patched onto an existing seed (by unionId). */
const localPatches = new Map<string, TenantLocal[]>();
const divisionPatches = new Map<string, Division[]>();
const unitPatches = new Map<string, BargainingUnit[]>();
const dataModulePatches = new Map<string, boolean>();
/** Full enabledModules replace for static or overlay unions (president config). */
const enabledModulesPatches = new Map<string, HubModule[]>();
/** Local Portal surface toggles (member nav). Unset → intelligent defaults. */
const portalSurfacesPatches = new Map<string, PortalSurfaceId[]>();
/** President role-tool nav toggles (ledger / invites / meetings). Unset → defaults. */
const presidentRoleToolsPatches = new Map<string, PresidentRoleToolId[]>();
/** Comms preset binding patch (null clears). Applied in loader mergeSeed. */
const commsPresetPatches = new Map<string, string | null>();
/** Operator theme patch (null clears). */
const brandThemePatches = new Map<
  string,
  BrandDefaults["brandTheme"] | null
>();
/** Hosted plan patches (ADR-024) — keyed by union id or local id. */
const unionHostedPlanPatches = new Map<string, HostedPlanRecord>();
const localHostedPlanPatches = new Map<string, HostedPlanRecord>();
/** True after Postgres tenant rows were merged into this process overlay. */
let hydratedFromDb = false;

export const DEFAULT_OVERLAY_MODULES: HubModule[] = [
  ...PRESIDENT_OVERLAY_MODULES,
];

export const DEFAULT_OVERLAY_GRIEVANCE = {
  steps: [
    { number: 1, name: "Step 1", responseDays: 5 },
    { number: 2, name: "Step 2", responseDays: 10 },
    { number: 3, name: "Step 3", responseDays: 15 },
    { number: 4, name: "Arbitration", responseDays: null },
  ],
};

export function isOverlayHydratedFromDb(): boolean {
  return hydratedFromDb;
}

export function markOverlayHydratedFromDb(): void {
  hydratedFromDb = true;
}

/** Web Crypto — works in Node, Edge, and browser (no Node `crypto` import). */
function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomHex(4)}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/** Neutral Brand Kit defaults for a newly provisioned union (not OPSEU). */
export function neutralBrandDefaultsForNewTenant(): BrandDefaults {
  const host = resolveHostBrandWithOverlay();
  return {
    primaryColor: host.primaryColor,
    secondaryColor: host.secondaryColor,
    accentColor: host.accentColor,
    useOfficialLogo: false,
    // Empty pack — operators supply assets; do not point at OPSEU/CAAT pack.
    assetPackPath: "/assets/",
    membershipUrls: [],
  };
}

export function getOverlaySeeds(): TenantSeed[] {
  return [...overlaySeeds.values()];
}

export function getLocalPatches(unionId: string): TenantLocal[] {
  return localPatches.get(unionId) ?? [];
}

export function getDivisionPatches(unionId: string): Division[] {
  return divisionPatches.get(unionId) ?? [];
}

export function createOverlayDivision(input: {
  unionId: string;
  code: string;
  name: string;
  enabledModules: HubModule[];
}): Division {
  const division: Division = {
    id: id("division"),
    unionId: input.unionId,
    code: input.code.trim().toLowerCase(),
    name: input.name.trim(),
    enabledModules: [...input.enabledModules],
  };
  importOverlayDivision(division);
  return division;
}

export function importOverlayDivision(division: Division): void {
  const list = divisionPatches.get(division.unionId) ?? [];
  if (list.some((row) => row.id === division.id)) return;
  divisionPatches.set(division.unionId, [...list, division]);
  const seed = overlaySeeds.get(division.unionId);
  if (seed) seed.divisions = [...(seed.divisions ?? []), division];
}

export function removeOverlayDivision(unionId: string, divisionId: string): void {
  divisionPatches.set(unionId, (divisionPatches.get(unionId) ?? []).filter((row) => row.id !== divisionId));
  const seed = overlaySeeds.get(unionId);
  if (seed?.divisions) seed.divisions = seed.divisions.filter((row) => row.id !== divisionId);
}

/** Patch code/name on an in-process division (bargaining collective). */
export function updateOverlayDivision(
  unionId: string,
  divisionId: string,
  patch: { code?: string; name?: string },
): void {
  const apply = (row: Division): Division => ({
    ...row,
    ...(patch.code !== undefined ? { code: patch.code.trim().toLowerCase() } : {}),
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
  });
  divisionPatches.set(
    unionId,
    (divisionPatches.get(unionId) ?? []).map((row) =>
      row.id === divisionId ? apply(row) : row,
    ),
  );
  const seed = overlaySeeds.get(unionId);
  if (seed?.divisions) {
    seed.divisions = seed.divisions.map((row) =>
      row.id === divisionId ? apply(row) : row,
    );
  }
}

export function getUnitPatches(unionId: string): BargainingUnit[] {
  return unitPatches.get(unionId) ?? [];
}

export function setDataModulePatch(unionId: string, enabled: boolean): void {
  dataModulePatches.set(unionId, enabled);
  const seed = overlaySeeds.get(unionId);
  if (seed) {
    const modules = new Set(seed.union.enabledModules);
    if (enabled) modules.add("data"); else modules.delete("data");
    seed.union.enabledModules = [...modules];
  }
  const full = enabledModulesPatches.get(unionId);
  if (full) {
    const modules = new Set(full);
    if (enabled) modules.add("data"); else modules.delete("data");
    enabledModulesPatches.set(unionId, [...modules]);
  }
}

export function getDataModulePatch(unionId: string): boolean | undefined {
  return dataModulePatches.get(unionId);
}

export function setEnabledModulesPatch(
  unionId: string,
  modules: HubModule[],
): void {
  const next = [...new Set(modules)];
  enabledModulesPatches.set(unionId, next);
  const seed = overlaySeeds.get(unionId);
  if (seed) {
    seed.union.enabledModules = next;
  }
}

export function getEnabledModulesPatch(
  unionId: string,
): HubModule[] | undefined {
  return enabledModulesPatches.get(unionId);
}

export function getCommsPresetPatch(unionId: string): string | null | undefined {
  return commsPresetPatches.get(unionId);
}

/** In-process binding: Hub union → Comms Brand Kit preset id (null clears). */
export function setCommsPresetPatch(
  unionId: string,
  presetId: string | null,
): void {
  commsPresetPatches.set(unionId, presetId);
  const seed = overlaySeeds.get(unionId);
  if (seed) {
    if (presetId) {
      seed.brandDefaults = {
        ...seed.brandDefaults,
        commsPresetId: presetId,
      };
    } else if (seed.brandDefaults.commsPresetId !== undefined) {
      const next = { ...seed.brandDefaults };
      delete next.commsPresetId;
      seed.brandDefaults = next;
    }
  }
}

export function getBrandThemePatch(
  unionId: string,
): BrandDefaults["brandTheme"] | null | undefined {
  return brandThemePatches.get(unionId);
}

/** In-process operator theme for a Hub union (null clears). */
export function setBrandThemePatch(
  unionId: string,
  theme: BrandDefaults["brandTheme"] | null,
): void {
  brandThemePatches.set(unionId, theme);
  const seed = overlaySeeds.get(unionId);
  if (seed) {
    if (theme) {
      seed.brandDefaults = {
        ...seed.brandDefaults,
        brandTheme: theme,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
      };
    } else if (seed.brandDefaults.brandTheme !== undefined) {
      const next = { ...seed.brandDefaults };
      delete next.brandTheme;
      seed.brandDefaults = next;
    }
  }
}

export function getUnionHostedPlanPatch(
  unionId: string,
): HostedPlanRecord | undefined {
  return unionHostedPlanPatches.get(unionId);
}

export function setUnionHostedPlanPatch(
  unionId: string,
  plan: HostedPlanRecord,
): void {
  unionHostedPlanPatches.set(unionId, plan);
}

export function getLocalHostedPlanPatch(
  localId: string,
): HostedPlanRecord | undefined {
  return localHostedPlanPatches.get(localId);
}

export function setLocalHostedPlanPatch(
  localId: string,
  plan: HostedPlanRecord,
): void {
  localHostedPlanPatches.set(localId, plan);
}

export function setPortalSurfacesPatch(
  unionId: string,
  surfaces: PortalSurfaceId[],
): void {
  portalSurfacesPatches.set(unionId, [...new Set(surfaces)]);
}

export function getPortalSurfacesPatch(
  unionId: string,
): PortalSurfaceId[] | undefined {
  return portalSurfacesPatches.get(unionId);
}

export function setPresidentRoleToolsPatch(
  unionId: string,
  tools: PresidentRoleToolId[],
): void {
  presidentRoleToolsPatches.set(unionId, [...new Set(tools)]);
}

export function getPresidentRoleToolsPatch(
  unionId: string,
): PresidentRoleToolId[] | undefined {
  return presidentRoleToolsPatches.get(unionId);
}

export function createOverlayLocal(input: {
  unionId: string;
  localNumber: string;
  subText: string;
  divisionId?: string;
}): TenantLocal {
  const local: TenantLocal = {
    id: id("local"),
    unionId: input.unionId,
    localNumber: input.localNumber.trim(),
    subText: input.subText.trim(),
    ...(input.divisionId ? { divisionId: input.divisionId } : {}),
  };
  const list = localPatches.get(input.unionId) ?? [];
  list.push(local);
  localPatches.set(input.unionId, list);
  // Also attach to overlay seed if this is a newly created union.
  const seed = overlaySeeds.get(input.unionId);
  if (seed) {
    seed.locals = [...(seed.locals ?? []), local];
  }
  return local;
}

export function removeOverlayLocal(unionId: string, localId: string): void {
  localPatches.set(unionId, (localPatches.get(unionId) ?? []).filter((row) => row.id !== localId));
  const seed = overlaySeeds.get(unionId);
  if (seed?.locals) seed.locals = seed.locals.filter((row) => row.id !== localId);
}

/** Patch number / sub-text / collective binding on an in-process local. */
export function updateOverlayLocal(
  unionId: string,
  localId: string,
  patch: {
    localNumber?: string;
    subText?: string;
    divisionId?: string | null;
  },
): void {
  const apply = (row: TenantLocal): TenantLocal => {
    const next: TenantLocal = {
      ...row,
      ...(patch.localNumber !== undefined
        ? { localNumber: patch.localNumber.trim() }
        : {}),
      ...(patch.subText !== undefined ? { subText: patch.subText.trim() } : {}),
    };
    if (patch.divisionId !== undefined) {
      if (patch.divisionId) next.divisionId = patch.divisionId;
      else delete next.divisionId;
    }
    return next;
  };
  localPatches.set(
    unionId,
    (localPatches.get(unionId) ?? []).map((row) =>
      row.id === localId ? apply(row) : row,
    ),
  );
  const seed = overlaySeeds.get(unionId);
  if (seed?.locals) {
    seed.locals = seed.locals.map((row) =>
      row.id === localId ? apply(row) : row,
    );
  }
}

export function createOverlayCollection(input: {
  unionId: string;
  localId: string;
  code: string;
  name: string;
}): BargainingUnit {
  const unit: BargainingUnit = {
    id: id("bu"),
    unionId: input.unionId,
    localId: input.localId,
    code: input.code.trim().toLowerCase(),
    name: input.name.trim(),
  };
  const list = unitPatches.get(input.unionId) ?? [];
  list.push(unit);
  unitPatches.set(input.unionId, list);
  const seed = overlaySeeds.get(input.unionId);
  if (seed) {
    seed.bargainingUnits = [...(seed.bargainingUnits ?? []), unit];
  }
  return unit;
}

export function removeOverlayCollection(unionId: string, unitId: string): void {
  unitPatches.set(unionId, (unitPatches.get(unionId) ?? []).filter((row) => row.id !== unitId));
  const seed = overlaySeeds.get(unionId);
  if (seed?.bargainingUnits) seed.bargainingUnits = seed.bargainingUnits.filter((row) => row.id !== unitId);
}

export function createOverlayUnion(input: {
  name: string;
  slug?: string;
  defaultLocale?: "en" | "fr";
  enabledModules?: HubModule[];
  localNumber?: string;
  localSubText?: string;
  collectionCode?: string;
  collectionName?: string;
}): TenantSeed {
  const name = input.name.trim();
  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(name)) || id("union");
  const unionId = id("union");
  const modules: HubModule[] =
    input.enabledModules && input.enabledModules.length > 0
      ? input.enabledModules
      : DEFAULT_OVERLAY_MODULES;

  const locals: TenantLocal[] = [];
  const bargainingUnits: BargainingUnit[] = [];

  if (input.localNumber?.trim()) {
    const local: TenantLocal = {
      id: id("local"),
      unionId,
      localNumber: input.localNumber.trim(),
      subText: (input.localSubText ?? "").trim() || "Support Staff",
    };
    locals.push(local);
    if (input.collectionCode?.trim() && input.collectionName?.trim()) {
      bargainingUnits.push({
        id: id("bu"),
        unionId,
        localId: local.id,
        code: input.collectionCode.trim().toLowerCase(),
        name: input.collectionName.trim(),
      });
    }
  }

  const seed: TenantSeed = {
    version: "1.1-overlay",
    description: `Runtime-provisioned tenant (${name}) — not derived from OPSEU seed`,
    union: {
      id: unionId,
      name,
      slug,
      defaultLocale: input.defaultLocale ?? "en",
      enabledModules: modules,
    },
    locals,
    bargainingUnits,
    brandDefaults: neutralBrandDefaultsForNewTenant(),
    grievanceConfig: DEFAULT_OVERLAY_GRIEVANCE,
  };

  overlaySeeds.set(unionId, seed);
  if (locals.length) localPatches.set(unionId, [...locals]);
  if (bargainingUnits.length) unitPatches.set(unionId, [...bargainingUnits]);
  return seed;
}

/**
 * Merge a local that already has an id (Postgres hydrate / durable create).
 * No-op when that id is already in the overlay for the union.
 */
export function importOverlayLocal(local: TenantLocal): void {
  const list = localPatches.get(local.unionId) ?? [];
  if (list.some((row) => row.id === local.id)) return;
  list.push(local);
  localPatches.set(local.unionId, list);
  const seed = overlaySeeds.get(local.unionId);
  if (seed) {
    seed.locals = [...(seed.locals ?? []).filter((row) => row.id !== local.id), local];
  }
}

/** Merge a collection that already has an id. */
export function importOverlayCollection(unit: BargainingUnit): void {
  const list = unitPatches.get(unit.unionId) ?? [];
  if (list.some((row) => row.id === unit.id)) return;
  list.push(unit);
  unitPatches.set(unit.unionId, list);
  const seed = overlaySeeds.get(unit.unionId);
  if (seed) {
    seed.bargainingUnits = [
      ...(seed.bargainingUnits ?? []).filter((row) => row.id !== unit.id),
      unit,
    ];
  }
}

/** Merge a runtime-provisioned union seed (never overwrites an existing overlay id). */
export function importOverlayUnion(seed: TenantSeed): void {
  const existing = overlaySeeds.get(seed.union.id);
  if (existing) {
    for (const division of seed.divisions ?? (seed.division ? [seed.division] : [])) importOverlayDivision(division);
    for (const local of seed.locals ?? []) importOverlayLocal(local);
    for (const unit of seed.bargainingUnits ?? []) importOverlayCollection(unit);
    if (seed.union.archivedAt !== undefined) {
      existing.union.archivedAt = seed.union.archivedAt;
    }
    if (seed.union.name) existing.union.name = seed.union.name;
    if (seed.union.slug) existing.union.slug = seed.union.slug;
    return;
  }
  overlaySeeds.set(seed.union.id, {
    ...seed,
    divisions: [...(seed.divisions ?? (seed.division ? [seed.division] : []))],
    locals: [...(seed.locals ?? [])],
    bargainingUnits: [...(seed.bargainingUnits ?? [])],
  });
  if (seed.locals?.length) {
    localPatches.set(seed.union.id, [...seed.locals]);
  }
  if (seed.divisions?.length) divisionPatches.set(seed.union.id, [...seed.divisions]);
  if (seed.bargainingUnits?.length) {
    unitPatches.set(seed.union.id, [...seed.bargainingUnits]);
  }
}

/** Drop a union seed and its local/division/unit patches from the in-process overlay. */
export function removeOverlayUnion(unionId: string): void {
  overlaySeeds.delete(unionId);
  localPatches.delete(unionId);
  divisionPatches.delete(unionId);
  unitPatches.delete(unionId);
  dataModulePatches.delete(unionId);
  enabledModulesPatches.delete(unionId);
  portalSurfacesPatches.delete(unionId);
  presidentRoleToolsPatches.delete(unionId);
  commsPresetPatches.delete(unionId);
  brandThemePatches.delete(unionId);
  unionHostedPlanPatches.delete(unionId);
}

/** Update display name on an overlay seed (no-op when missing). */
export function renameOverlayUnion(unionId: string, name: string): void {
  const seed = overlaySeeds.get(unionId);
  if (seed) seed.union.name = name.trim();
}

/** Mark or clear soft-archive on an overlay seed. */
export function setOverlayUnionArchived(
  unionId: string,
  archivedAt: string | null,
): void {
  const seed = overlaySeeds.get(unionId);
  if (seed) seed.union.archivedAt = archivedAt;
}

/** @internal test helper */
export function resetTenantOverlayForTests(): void {
  overlaySeeds.clear();
  localPatches.clear();
  divisionPatches.clear();
  unitPatches.clear();
  dataModulePatches.clear();
  enabledModulesPatches.clear();
  portalSurfacesPatches.clear();
  presidentRoleToolsPatches.clear();
  commsPresetPatches.clear();
  brandThemePatches.clear();
  unionHostedPlanPatches.clear();
  localHostedPlanPatches.clear();
  hydratedFromDb = false;
}
