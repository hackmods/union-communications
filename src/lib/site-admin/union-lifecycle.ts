/**
 * Site-admin union lifecycle: list, rename, soft-archive/restore, empty hard-delete.
 *
 * Hard delete never cascades casework — use demo purge for `is_demo` wipes.
 * Production deletes require archive-first + zero attachments.
 */
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb, isPostgresConfigured, type Db } from "@/lib/db/client";
import {
  bargainingUnits,
  divisions,
  locals,
  unions,
  users,
} from "@/lib/db/schema/tenant";
import { localMemberships } from "@/lib/db/schema/organization-access";
import { userInvites } from "@/lib/db/schema/auth";
import {
  importOverlayUnion,
  removeOverlayUnion,
  renameOverlayUnion,
  DEFAULT_OVERLAY_GRIEVANCE,
  neutralBrandDefaultsForNewTenant,
} from "@/lib/tenant/overlay";
import { DEMO_PURGE_UNION_SCOPED_TABLES } from "@/lib/site-admin/demo-purge";
import type { HubModule, TenantSeed } from "@/types/tenant";

import {
  duplicateNameKeys,
  sortUnionsForSiteAdmin,
  unionNameKey,
  type UnionLifecycleRow,
} from "@/lib/site-admin/union-lifecycle-shared";
export type { UnionLifecycleRow } from "@/lib/site-admin/union-lifecycle-shared";
export {
  unionNameKey,
  sortUnionsForSiteAdmin,
  duplicateNameKeys,
} from "@/lib/site-admin/union-lifecycle-shared";



export type UnionAttachmentCounts = {
  locals: number;
  activeLocals: number;
  users: number;
  divisions: number;
  bargainingUnits: number;
  memberships: number;
  invites: number;
  casework: number;
};

export type LifecycleResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 404 | 409 | 503; error: string; code?: string };

function requirePostgres(): LifecycleResult<never> | null {
  if (!isPostgresConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "Postgres is not configured",
      code: "postgres_required",
    };
  }
  return null;
}

async function countCaseworkForUnion(db: Db, unionId: string): Promise<number> {
  let total = 0;
  for (const table of DEMO_PURGE_UNION_SCOPED_TABLES) {
    // Table names are a fixed allowlist; unionId is a bound parameter.
    const result = await db.execute(
      sql`SELECT count(*)::int AS n FROM ${sql.raw(`"${table}"`)} WHERE union_id = ${unionId}`,
    );
    const rows = (
      Array.isArray(result)
        ? result
        : ((result as { rows?: unknown }).rows ?? [])
    ) as Array<{ n: number }>;
    total += Number(rows[0]?.n ?? 0);
  }
  return total;
}

export async function countUnionAttachments(
  unionId: string,
): Promise<UnionAttachmentCounts> {
  const db = getDb();
  const [localTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(locals)
    .where(eq(locals.unionId, unionId));
  const [localActive] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(locals)
    .where(and(eq(locals.unionId, unionId), isNull(locals.archivedAt)));
  const [userTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.unionId, unionId));
  const [divisionTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(divisions)
    .where(eq(divisions.unionId, unionId));
  const [unitTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bargainingUnits)
    .where(eq(bargainingUnits.unionId, unionId));
  const [membershipTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(localMemberships)
    .where(eq(localMemberships.unionId, unionId));
  const [inviteTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(userInvites)
    .where(eq(userInvites.unionId, unionId));
  const casework = await countCaseworkForUnion(db, unionId);
  return {
    locals: localTotal?.n ?? 0,
    activeLocals: localActive?.n ?? 0,
    users: userTotal?.n ?? 0,
    divisions: divisionTotal?.n ?? 0,
    bargainingUnits: unitTotal?.n ?? 0,
    memberships: membershipTotal?.n ?? 0,
    invites: inviteTotal?.n ?? 0,
    casework,
  };
}

export function isUnionEmpty(counts: UnionAttachmentCounts): boolean {
  return (
    counts.locals === 0 &&
    counts.users === 0 &&
    counts.memberships === 0 &&
    counts.invites === 0 &&
    counts.casework === 0 &&
    counts.bargainingUnits === 0
  );
}

export async function listUnionsForSiteAdmin(): Promise<UnionLifecycleRow[]> {
  const gate = requirePostgres();
  if (gate) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: unions.id,
      name: unions.name,
      slug: unions.slug,
      isDemo: unions.isDemo,
      archivedAt: unions.archivedAt,
      createdAt: unions.createdAt,
      membershipPolicy: unions.membershipPolicy,
    })
    .from(unions)
    .orderBy(asc(unions.name));

  const mapped = await Promise.all(
    rows.map(async (row) => {
      const counts = await countUnionAttachments(row.id);
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        isDemo: row.isDemo,
        archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
        createdAt: row.createdAt ? row.createdAt.toISOString() : null,
        membershipPolicy: row.membershipPolicy ?? "multi_local",
        localCount: counts.locals,
        activeLocalCount: counts.activeLocals,
        userCount: counts.users,
        inviteCount: counts.invites,
        membershipCount: counts.memberships,
        caseworkCount: counts.casework,
        empty: isUnionEmpty(counts),
      };
    }),
  );
  return sortUnionsForSiteAdmin(mapped);
}

export async function renameUnion(
  unionId: string,
  rawName: string,
): Promise<LifecycleResult<{ name: string }>> {
  const gate = requirePostgres();
  if (gate) return gate;
  const name = rawName.trim();
  if (!name) {
    return { ok: false, status: 400, error: "Name is required", code: "name_required" };
  }
  const db = getDb();
  const [existing] = await db
    .select({ id: unions.id, archivedAt: unions.archivedAt })
    .from(unions)
    .where(eq(unions.id, unionId))
    .limit(1);
  if (!existing) {
    return { ok: false, status: 404, error: "Union not found" };
  }
  const [collision] = await db
    .select({ id: unions.id })
    .from(unions)
    .where(
      and(
        sql`lower(${unions.name}) = lower(${name})`,
        isNull(unions.archivedAt),
        ne(unions.id, unionId),
      ),
    )
    .limit(1);
  if (collision) {
    return {
      ok: false,
      status: 409,
      error: "Another active union already uses this name",
      code: "name_taken",
    };
  }
  await db.update(unions).set({ name }).where(eq(unions.id, unionId));
  renameOverlayUnion(unionId, name);
  return { ok: true, data: { name } };
}

export async function archiveUnion(
  unionId: string,
  actorUserId: string,
): Promise<LifecycleResult<{ archivedAt: string }>> {
  const gate = requirePostgres();
  if (gate) return gate;
  const db = getDb();
  const [existing] = await db
    .select({ id: unions.id, archivedAt: unions.archivedAt })
    .from(unions)
    .where(eq(unions.id, unionId))
    .limit(1);
  if (!existing) {
    return { ok: false, status: 404, error: "Union not found" };
  }
  if (existing.archivedAt) {
    return {
      ok: true,
      data: { archivedAt: existing.archivedAt.toISOString() },
    };
  }
  const now = new Date();
  await db
    .update(unions)
    .set({ archivedAt: now, archivedById: actorUserId })
    .where(eq(unions.id, unionId));
  removeOverlayUnion(unionId);
  return { ok: true, data: { archivedAt: now.toISOString() } };
}

export async function restoreUnion(
  unionId: string,
): Promise<LifecycleResult<void>> {
  const gate = requirePostgres();
  if (gate) return gate;
  const db = getDb();
  const [existing] = await db
    .select()
    .from(unions)
    .where(eq(unions.id, unionId))
    .limit(1);
  if (!existing) {
    return { ok: false, status: 404, error: "Union not found" };
  }
  if (!existing.archivedAt) {
    return { ok: true, data: undefined };
  }
  const [nameClash] = await db
    .select({ id: unions.id })
    .from(unions)
    .where(
      and(
        sql`lower(${unions.name}) = lower(${existing.name})`,
        isNull(unions.archivedAt),
        ne(unions.id, unionId),
      ),
    )
    .limit(1);
  if (nameClash) {
    return {
      ok: false,
      status: 409,
      error:
        "Another active union already uses this name. Rename one before restoring.",
      code: "name_taken",
    };
  }
  await db
    .update(unions)
    .set({ archivedAt: null, archivedById: null })
    .where(eq(unions.id, unionId));

  const unionLocals = await db
    .select()
    .from(locals)
    .where(eq(locals.unionId, unionId));
  const unionDivisions = await db
    .select()
    .from(divisions)
    .where(eq(divisions.unionId, unionId));
  const unionUnits = await db
    .select()
    .from(bargainingUnits)
    .where(eq(bargainingUnits.unionId, unionId));

  const seed: TenantSeed = {
    version: "1.1-overlay",
    description: `Runtime-provisioned tenant (${existing.name}) — not derived from OPSEU seed`,
    union: {
      id: existing.id,
      name: existing.name,
      slug: existing.slug,
      defaultLocale: existing.defaultLocale === "fr" ? "fr" : "en",
      enabledModules: (existing.enabledModules ?? []) as HubModule[],
      archivedAt: null,
    },
    divisions: unionDivisions.map((d) => ({
      id: d.id,
      unionId: d.unionId,
      name: d.name,
      code: d.code,
      enabledModules: (d.enabledModules ?? []) as HubModule[],
    })),
    locals: unionLocals.map((l) => ({
      id: l.id,
      unionId: l.unionId,
      localNumber: l.localNumber,
      subText: l.subText,
      ...(l.divisionId ? { divisionId: l.divisionId } : {}),
    })),
    bargainingUnits: unionUnits.map((u) => ({
      id: u.id,
      unionId: u.unionId,
      localId: u.localId,
      code: u.code,
      name: u.name,
      ...(u.grievanceConfig ? { grievanceConfig: u.grievanceConfig } : {}),
    })),
    brandDefaults: {
      ...neutralBrandDefaultsForNewTenant(),
      ...(existing.commsPresetId
        ? { commsPresetId: existing.commsPresetId }
        : {}),
      ...(existing.brandTheme
        ? {
            brandTheme: existing.brandTheme as TenantSeed["brandDefaults"]["brandTheme"],
          }
        : {}),
    },
    grievanceConfig: DEFAULT_OVERLAY_GRIEVANCE,
  };
  importOverlayUnion(seed);
  return { ok: true, data: undefined };
}

/**
 * Hard-delete an archived, empty union. Divisions with no dependents are
 * removed first. Refuses when locals, users, memberships, invites, or casework remain.
 */
export async function hardDeleteEmptyUnion(
  unionId: string,
  confirmSlug: string,
  actorUserId: string,
): Promise<LifecycleResult<{ deletedId: string }>> {
  const gate = requirePostgres();
  if (gate) return gate;
  const db = getDb();
  const [existing] = await db
    .select({
      id: unions.id,
      slug: unions.slug,
      archivedAt: unions.archivedAt,
    })
    .from(unions)
    .where(eq(unions.id, unionId))
    .limit(1);
  if (!existing) {
    return { ok: false, status: 404, error: "Union not found" };
  }
  if (!existing.archivedAt) {
    return {
      ok: false,
      status: 400,
      error: "Archive the union before deleting it",
      code: "archive_required",
    };
  }
  if (confirmSlug.trim() !== existing.slug) {
    return {
      ok: false,
      status: 400,
      error: "Confirmation slug does not match",
      code: "confirm_mismatch",
    };
  }
  const counts = await countUnionAttachments(unionId);
  if (!isUnionEmpty(counts)) {
    return {
      ok: false,
      status: 409,
      error:
        "Delete blocked: locals, users, invites, or casework are still attached. Archive those first, or use demo cleanup if this is a demo tenant.",
      code: "not_empty",
    };
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    // Archive-first contract even when already archived (idempotent stamp).
    await tx
      .update(unions)
      .set({
        archivedAt: existing.archivedAt ?? now,
        archivedById: actorUserId,
      })
      .where(eq(unions.id, unionId));

    if (counts.divisions > 0) {
      await tx.delete(divisions).where(eq(divisions.unionId, unionId));
    }
    await tx.delete(unions).where(eq(unions.id, unionId));
  });
  removeOverlayUnion(unionId);
  return { ok: true, data: { deletedId: unionId } };
}
