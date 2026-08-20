import { eq } from "drizzle-orm";
import referenceTenant from "../../../seed/reference-tenant-opseu-caat.json";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import {
  bargainingUnits,
  divisions,
  locals,
  unions,
} from "@/lib/db/schema";
import { findLocalByNumber } from "@/lib/tenant/loader";
import {
  createOverlayCollection,
  createOverlayLocal,
  createOverlayUnion,
  DEFAULT_OVERLAY_GRIEVANCE,
  importOverlayCollection,
  importOverlayLocal,
  importOverlayUnion,
  isOverlayHydratedFromDb,
  markOverlayHydratedFromDb,
  neutralBrandDefaultsForNewTenant,
} from "@/lib/tenant/overlay";
import type {
  BargainingUnit,
  HubModule,
  TenantLocal,
  TenantSeed,
} from "@/types/tenant";

const REFERENCE = referenceTenant as TenantSeed;
const STATIC_UNION_IDS = new Set([REFERENCE.union.id]);
const STATIC_LOCAL_IDS = new Set(
  (REFERENCE.locals ?? []).map((local) => local.id),
);
const STATIC_UNIT_IDS = new Set(
  (REFERENCE.bargainingUnits ?? []).map((unit) => unit.id),
);

const HUB_MODULES: HubModule[] = [
  "comms",
  "grievance",
  "bumping",
  "time",
  "discussions",
  "tasks",
  "informalLog",
  "checkins",
  "portal",
];

function asHubModules(raw: string[] | null | undefined): HubModule[] {
  const allowed = new Set<string>(HUB_MODULES);
  return (raw ?? []).filter((m): m is HubModule => allowed.has(m));
}

export function tenantsPostgresEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return isPostgresConfigured(env as NodeJS.ProcessEnv);
}

export type PersistedTenantSnapshot = {
  unions: Array<{
    id: string;
    name: string;
    slug: string;
    defaultLocale: string;
    enabledModules: string[];
  }>;
  divisions: Array<{
    id: string;
    unionId: string;
    name: string;
    code: string;
    enabledModules: string[];
  }>;
  locals: TenantLocal[];
  bargainingUnits: BargainingUnit[];
};

/** Merge a DB snapshot into the in-process overlay (idempotent). */
export function applyPersistedSnapshotToOverlay(
  snapshot: PersistedTenantSnapshot,
): void {
  const localsByUnion = new Map<string, TenantLocal[]>();
  for (const local of snapshot.locals) {
    const list = localsByUnion.get(local.unionId) ?? [];
    list.push(local);
    localsByUnion.set(local.unionId, list);
  }
  const unitsByUnion = new Map<string, BargainingUnit[]>();
  for (const unit of snapshot.bargainingUnits) {
    const list = unitsByUnion.get(unit.unionId) ?? [];
    list.push(unit);
    unitsByUnion.set(unit.unionId, list);
  }

  for (const row of snapshot.unions) {
    if (STATIC_UNION_IDS.has(row.id)) continue;
    const division = snapshot.divisions.find((d) => d.unionId === row.id);
    importOverlayUnion({
      version: "1.1-overlay",
      description: `Runtime-provisioned tenant (${row.name}) — not derived from OPSEU seed`,
      union: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        defaultLocale: row.defaultLocale === "fr" ? "fr" : "en",
        enabledModules: asHubModules(row.enabledModules),
      },
      ...(division
        ? {
            division: {
              id: division.id,
              unionId: division.unionId,
              name: division.name,
              code: division.code,
              enabledModules: asHubModules(division.enabledModules),
            },
          }
        : {}),
      locals: localsByUnion.get(row.id) ?? [],
      bargainingUnits: unitsByUnion.get(row.id) ?? [],
      brandDefaults: neutralBrandDefaultsForNewTenant(),
      grievanceConfig: DEFAULT_OVERLAY_GRIEVANCE,
    });
  }

  for (const local of snapshot.locals) {
    if (STATIC_LOCAL_IDS.has(local.id)) continue;
    importOverlayLocal(local);
  }
  for (const unit of snapshot.bargainingUnits) {
    if (STATIC_UNIT_IDS.has(unit.id)) continue;
    importOverlayCollection(unit);
  }
}

async function loadPersistedSnapshot(): Promise<PersistedTenantSnapshot> {
  const db = getDb();
  const unionRows = await db.select().from(unions);
  const divisionRows = await db.select().from(divisions);
  const localRows = await db.select().from(locals);
  const unitRows = await db.select().from(bargainingUnits);
  return {
    unions: unionRows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      defaultLocale: row.defaultLocale,
      enabledModules: row.enabledModules ?? [],
    })),
    divisions: divisionRows.map((row) => ({
      id: row.id,
      unionId: row.unionId,
      name: row.name,
      code: row.code,
      enabledModules: row.enabledModules ?? [],
    })),
    locals: localRows.map((row) => ({
      id: row.id,
      unionId: row.unionId,
      localNumber: row.localNumber,
      subText: row.subText,
      ...(row.divisionId ? { divisionId: row.divisionId } : {}),
    })),
    bargainingUnits: unitRows.map((row) => ({
      id: row.id,
      unionId: row.unionId,
      localId: row.localId,
      code: row.code,
      name: row.name,
      ...(row.grievanceConfig ? { grievanceConfig: row.grievanceConfig } : {}),
    })),
  };
}

let hydrateInflight: Promise<void> | null = null;

/** Load Postgres tenant rows into the overlay once per process. */
export async function hydrateTenantOverlayFromPostgres(): Promise<void> {
  if (!tenantsPostgresEnabled() || isOverlayHydratedFromDb()) return;
  if (hydrateInflight) return hydrateInflight;
  hydrateInflight = (async () => {
    try {
      const snapshot = await loadPersistedSnapshot();
      applyPersistedSnapshotToOverlay(snapshot);
      markOverlayHydratedFromDb();
    } finally {
      hydrateInflight = null;
    }
  })();
  return hydrateInflight;
}

export async function persistLocal(local: TenantLocal): Promise<void> {
  if (!tenantsPostgresEnabled()) return;
  const db = getDb();
  await db
    .insert(locals)
    .values({
      id: local.id,
      unionId: local.unionId,
      divisionId: local.divisionId ?? null,
      localNumber: local.localNumber,
      subText: local.subText,
    })
    .onConflictDoUpdate({
      target: locals.id,
      set: {
        unionId: local.unionId,
        divisionId: local.divisionId ?? null,
        localNumber: local.localNumber,
        subText: local.subText,
      },
    });
}

export async function persistCollection(unit: BargainingUnit): Promise<void> {
  if (!tenantsPostgresEnabled()) return;
  const db = getDb();
  await db
    .insert(bargainingUnits)
    .values({
      id: unit.id,
      unionId: unit.unionId,
      localId: unit.localId,
      code: unit.code,
      name: unit.name,
      grievanceConfig: unit.grievanceConfig,
    })
    .onConflictDoUpdate({
      target: bargainingUnits.id,
      set: {
        unionId: unit.unionId,
        localId: unit.localId,
        code: unit.code,
        name: unit.name,
        grievanceConfig: unit.grievanceConfig,
      },
    });
}

export async function persistUnionSeed(seed: TenantSeed): Promise<void> {
  if (!tenantsPostgresEnabled()) return;
  const db = getDb();
  await db
    .insert(unions)
    .values({
      id: seed.union.id,
      name: seed.union.name,
      slug: seed.union.slug,
      defaultLocale: seed.union.defaultLocale,
      enabledModules: seed.union.enabledModules,
    })
    .onConflictDoUpdate({
      target: unions.id,
      set: {
        name: seed.union.name,
        slug: seed.union.slug,
        defaultLocale: seed.union.defaultLocale,
        enabledModules: seed.union.enabledModules,
      },
    });

  if (seed.division) {
    await db
      .insert(divisions)
      .values({
        id: seed.division.id,
        unionId: seed.division.unionId,
        name: seed.division.name,
        code: seed.division.code,
        enabledModules: seed.division.enabledModules,
      })
      .onConflictDoUpdate({
        target: divisions.id,
        set: {
          unionId: seed.division.unionId,
          name: seed.division.name,
          code: seed.division.code,
          enabledModules: seed.division.enabledModules,
        },
      });
  }

  for (const local of seed.locals ?? []) {
    await persistLocal(local);
  }
  for (const unit of seed.bargainingUnits ?? []) {
    await persistCollection(unit);
  }
}

export async function createLocalDurable(input: {
  unionId: string;
  localNumber: string;
  subText: string;
  divisionId?: string;
}): Promise<TenantLocal> {
  const local = createOverlayLocal(input);
  await persistLocal(local);
  return local;
}

export async function createCollectionDurable(input: {
  unionId: string;
  localId: string;
  code: string;
  name: string;
}): Promise<BargainingUnit> {
  const unit = createOverlayCollection(input);
  await persistCollection(unit);
  return unit;
}

export async function createUnionDurable(
  input: Parameters<typeof createOverlayUnion>[0],
): Promise<TenantSeed> {
  const seed = createOverlayUnion(input);
  if (await slugTakenByOtherUnion(seed.union.slug, seed.union.id)) {
    seed.union.slug = `${seed.union.slug}-${seed.union.id.replace(/^union-/, "").slice(0, 12)}`;
  }
  await persistUnionSeed(seed);
  return seed;
}

export async function findOrCreateLocal(input: {
  unionId: string;
  localNumber: string;
  subText?: string;
  divisionId?: string;
}): Promise<{ local: TenantLocal; created: boolean }> {
  await hydrateTenantOverlayFromPostgres();
  const existing = findLocalByNumber(input.unionId, input.localNumber);
  if (existing) return { local: existing, created: false };
  const local = await createLocalDurable({
    unionId: input.unionId,
    localNumber: input.localNumber,
    subText: input.subText?.trim() ?? "",
    divisionId: input.divisionId,
  });
  return { local, created: true };
}

/** True when this slug is already taken by another union id. */
export async function slugTakenByOtherUnion(
  slug: string,
  unionId: string,
): Promise<boolean> {
  if (!tenantsPostgresEnabled()) return false;
  const db = getDb();
  const rows = await db
    .select({ id: unions.id })
    .from(unions)
    .where(eq(unions.slug, slug))
    .limit(1);
  return Boolean(rows[0] && rows[0].id !== unionId);
}
