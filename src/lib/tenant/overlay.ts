import { randomBytes } from "crypto";
import { resolveHostBrandDefaults } from "@/lib/constants/host-brand";
import type {
  BargainingUnit,
  BrandDefaults,
  HubModule,
  TenantLocal,
  TenantSeed,
} from "@/types/tenant";

/**
 * In-memory tenant overlay merged by the loader.
 * Survives for the process lifetime only (same durability model as memory adapters).
 * New unions never clone the OPSEU reference seed — brand defaults come from host brand.
 */
const overlaySeeds = new Map<string, TenantSeed>();
/** Locals / collections patched onto an existing seed (by unionId). */
const localPatches = new Map<string, TenantLocal[]>();
const unitPatches = new Map<string, BargainingUnit[]>();
/** True after Postgres tenant rows were merged into this process overlay. */
let hydratedFromDb = false;

export const DEFAULT_OVERLAY_MODULES: HubModule[] = [
  "comms",
  "grievance",
  "portal",
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

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}`;
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
  const host = resolveHostBrandDefaults();
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

export function getUnitPatches(unionId: string): BargainingUnit[] {
  return unitPatches.get(unionId) ?? [];
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
    for (const local of seed.locals ?? []) importOverlayLocal(local);
    for (const unit of seed.bargainingUnits ?? []) importOverlayCollection(unit);
    return;
  }
  overlaySeeds.set(seed.union.id, {
    ...seed,
    locals: [...(seed.locals ?? [])],
    bargainingUnits: [...(seed.bargainingUnits ?? [])],
  });
  if (seed.locals?.length) {
    localPatches.set(seed.union.id, [...seed.locals]);
  }
  if (seed.bargainingUnits?.length) {
    unitPatches.set(seed.union.id, [...seed.bargainingUnits]);
  }
}

/** @internal test helper */
export function resetTenantOverlayForTests(): void {
  overlaySeeds.clear();
  localPatches.clear();
  unitPatches.clear();
  hydratedFromDb = false;
}
