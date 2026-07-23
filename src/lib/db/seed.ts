/**
 * Idempotent Postgres seed for the reference tenant (SEC-003).
 *
 * Usage:
 *   DATABASE_URL=postgres://… npm run db:seed
 *   SEED_DEMO_CASES=true npm run db:seed   # also upsert a minimal demo grievance
 *
 * Prefer the table-owner URL for seeding (FK upserts). Runtime should use
 * `unionops_app` so RLS binds — see migration 0008_app_role.sql.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { getDb, isPostgresConfigured, resetDbClient } from "@/lib/db/client";
import {
  bargainingUnits,
  divisions,
  grievanceEvents,
  grievances,
  locals,
  unions,
} from "@/lib/db/schema";

interface SeedBargainingUnit {
  id: string;
  unionId: string;
  localId: string;
  code: string;
  name: string;
  grievanceConfig?: {
    steps: { number: number; name: string; responseDays: number | null }[];
  };
}

interface SeedLocal {
  id: string;
  unionId: string;
  divisionId?: string;
  localNumber: string;
  subText?: string;
}

interface ReferenceTenantSeed {
  union: {
    id: string;
    name: string;
    slug: string;
    defaultLocale?: string;
    enabledModules: string[];
  };
  division: {
    id: string;
    unionId: string;
    name: string;
    code: string;
    enabledModules: string[];
  };
  locals: SeedLocal[];
  bargainingUnits: SeedBargainingUnit[];
}

const DEMO_GRIEVANCE_ID = "grev-seed-demo-001";
const DEMO_EVENT_ID = "evt-seed-demo-001";

function loadReferenceTenant(): ReferenceTenantSeed {
  const path = resolve(process.cwd(), "seed/reference-tenant-opseu-caat.json");
  return JSON.parse(readFileSync(path, "utf8")) as ReferenceTenantSeed;
}

/** Upsert reference union / division / locals / bargaining units. Safe to re-run. */
export async function seedReferenceTenant(): Promise<ReferenceTenantSeed> {
  const seed = loadReferenceTenant();
  const db = getDb();

  await db
    .insert(unions)
    .values({
      id: seed.union.id,
      name: seed.union.name,
      slug: seed.union.slug,
      defaultLocale: seed.union.defaultLocale ?? "en",
      enabledModules: seed.union.enabledModules,
    })
    .onConflictDoUpdate({
      target: unions.id,
      set: {
        name: seed.union.name,
        slug: seed.union.slug,
        defaultLocale: seed.union.defaultLocale ?? "en",
        enabledModules: seed.union.enabledModules,
      },
    });

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

  for (const local of seed.locals) {
    await db
      .insert(locals)
      .values({
        id: local.id,
        unionId: local.unionId,
        divisionId: local.divisionId ?? null,
        localNumber: local.localNumber,
        subText: local.subText ?? "",
      })
      .onConflictDoUpdate({
        target: locals.id,
        set: {
          unionId: local.unionId,
          divisionId: local.divisionId ?? null,
          localNumber: local.localNumber,
          subText: local.subText ?? "",
        },
      });
  }

  for (const bu of seed.bargainingUnits) {
    await db
      .insert(bargainingUnits)
      .values({
        id: bu.id,
        unionId: bu.unionId,
        localId: bu.localId,
        code: bu.code,
        name: bu.name,
        grievanceConfig: bu.grievanceConfig,
      })
      .onConflictDoUpdate({
        target: bargainingUnits.id,
        set: {
          unionId: bu.unionId,
          localId: bu.localId,
          code: bu.code,
          name: bu.name,
          grievanceConfig: bu.grievanceConfig,
        },
      });
  }

  return seed;
}

/**
 * Upsert a single open demo grievance (fixed ids) for local smoke / workshops.
 * Requires reference tenant rows to exist.
 */
export async function seedDemoGrievance(
  seed: ReferenceTenantSeed = loadReferenceTenant(),
): Promise<string> {
  const db = getDb();
  const local = seed.locals[0];
  const bu = seed.bargainingUnits.find((b) => b.localId === local.id);
  const now = new Date();

  await db
    .insert(grievances)
    .values({
      id: DEMO_GRIEVANCE_ID,
      unionId: seed.union.id,
      localId: local.id,
      bargainingUnitId: bu?.id,
      memberPseudonym: "Seed Demo Member",
      category: "seed-demo",
      status: "open",
      currentStep: 1,
      filedAt: now,
      assignedStewardId: "user-seed-demo",
      createdById: "user-seed-demo",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: grievances.id,
      set: {
        unionId: seed.union.id,
        localId: local.id,
        bargainingUnitId: bu?.id,
        memberPseudonym: "Seed Demo Member",
        category: "seed-demo",
        status: "open",
        currentStep: 1,
        assignedStewardId: "user-seed-demo",
        updatedAt: now,
      },
    });

  const existingEvent = await db
    .select({ id: grievanceEvents.id })
    .from(grievanceEvents)
    .where(eq(grievanceEvents.id, DEMO_EVENT_ID))
    .limit(1);

  if (existingEvent.length === 0) {
    await db.insert(grievanceEvents).values({
      id: DEMO_EVENT_ID,
      grievanceId: DEMO_GRIEVANCE_ID,
      type: "step_filed",
      stepNumber: 1,
      createdAt: now,
    });
  }

  return DEMO_GRIEVANCE_ID;
}

export async function runSeed(options?: {
  demoCases?: boolean;
}): Promise<void> {
  if (!isPostgresConfigured()) {
    throw new Error(
      "DATABASE_URL is not set. Configure Postgres before running db:seed.",
    );
  }

  const seed = await seedReferenceTenant();
  console.log(
    `[db:seed] upserted tenant ${seed.union.slug} (${seed.locals.length} locals, ${seed.bargainingUnits.length} collections)`,
  );

  const demo =
    options?.demoCases ??
    process.env.SEED_DEMO_CASES?.trim().toLowerCase() === "true";
  if (demo) {
    const id = await seedDemoGrievance(seed);
    console.log(`[db:seed] upserted demo grievance ${id}`);
  }
}

async function main(): Promise<void> {
  try {
    await runSeed();
  } finally {
    resetDbClient();
  }
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  /seed(\.ts)?$/i.test(process.argv[1].replace(/\\/g, "/"));

if (isDirectRun) {
  main().catch((err) => {
    console.error("[db:seed] failed:", err);
    process.exitCode = 1;
  });
}
