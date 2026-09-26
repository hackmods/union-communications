import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, getRlsTx, type Db } from "@/lib/db/client";
import { getOwnerDb, isOwnerDbConfigured } from "@/lib/db/owner-client";
import { applyRlsContext } from "@/lib/db/rls-context";
import {
  bargainingUnits,
  locals,
  unions,
  users,
  type MembershipPolicy,
} from "@/lib/db/schema/tenant";
import { localMemberships } from "@/lib/db/schema/organization-access";
import {
  createUnionDurable,
  findOrCreateLocal,
} from "@/lib/tenant/persist";

/**
 * Site-admin assign is cross-tenant. `local_memberships` INSERT policies require
 * `app_org_manage`, which binds to the actor's own union GUCs — so a
 * platform_admin assigning into another (or newly created) union fails under
 * `unionops_app`. Prefer the owner role when configured (same pattern as demo
 * purge / operator audit).
 */
function getAssignDb(): Db {
  return isOwnerDbConfigured() ? getOwnerDb() : getDb();
}

// #region agent log
function getRlsTxSafe(): unknown {
  try {
    return getRlsTx();
  } catch {
    return null;
  }
}

function summarizeDbError(
  err: unknown,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const e = err as {
    message?: string;
    code?: string;
    cause?: {
      message?: string;
      code?: string;
      detail?: string;
      constraint?: string;
      schema?: string;
      table?: string;
    };
  };
  return {
    ...extra,
    message: e?.message ?? String(err),
    code: e?.code ?? null,
    causeMessage: e?.cause?.message ?? null,
    causeCode: e?.cause?.code ?? null,
    causeDetail: e?.cause?.detail ?? null,
    causeConstraint: e?.cause?.constraint ?? null,
    causeTable: e?.cause?.table ?? null,
  };
}
// #endregion

export type AssignLocalInput = {
  actorUserId: string;
  targetUserId: string;
  /** Existing union id, or omit when creating via newUnionName. */
  unionId?: string;
  /** platform_admin “Other / Enter Union”. */
  newUnionName?: string;
  localId?: string;
  localNumber?: string;
  localSubText?: string;
  bargainingUnitId?: string | null;
  /** When true (or restoring orphan), mark this membership primary. */
  setPrimary?: boolean;
  /**
   * When membershipPolicy is single_local and another active membership exists,
   * end the previous one and activate the new local.
   */
  replaceActiveMembership?: boolean;
};

export type AssignLocalResult =
  | {
      ok: true;
      unionId: string;
      localId: string;
      membershipId: string;
      membershipPolicy: MembershipPolicy;
      createdLocal: boolean;
      createdUnion: boolean;
      replacedMembershipIds: string[];
    }
  | {
      ok: false;
      status: 400 | 404 | 409;
      error: string;
      code?: "single_local_conflict";
      conflictingLocalIds?: string[];
    };

async function resolveUnion(input: AssignLocalInput): Promise<
  | { ok: true; unionId: string; policy: MembershipPolicy; createdUnion: boolean }
  | { ok: false; status: 400 | 404; error: string }
> {
  const db = getAssignDb();
  if (input.newUnionName?.trim()) {
    const name = input.newUnionName.trim();
    // Reuse an existing active union with the same display name so failed
    // assign retries (and "Other / Enter union") do not mint duplicates.
    const [existingByName] = await db
      .select({
        id: unions.id,
        membershipPolicy: unions.membershipPolicy,
      })
      .from(unions)
      .where(
        and(
          sql`lower(${unions.name}) = lower(${name})`,
          isNull(unions.archivedAt),
        ),
      )
      .orderBy(asc(unions.createdAt))
      .limit(1);
    if (existingByName) {
      return {
        ok: true,
        unionId: existingByName.id,
        policy: existingByName.membershipPolicy ?? "multi_local",
        createdUnion: false,
      };
    }
    const seed = await createUnionDurable({
      name,
      localNumber: input.localNumber?.trim() || "1",
      localSubText: input.localSubText,
    });
    const [row] = await db
      .select({
        id: unions.id,
        membershipPolicy: unions.membershipPolicy,
      })
      .from(unions)
      .where(eq(unions.id, seed.union.id))
      .limit(1);
    if (!row) {
      return { ok: false, status: 404, error: "Created union not found" };
    }
    return {
      ok: true,
      unionId: row.id,
      policy: row.membershipPolicy ?? "multi_local",
      createdUnion: true,
    };
  }
  if (!input.unionId) {
    return { ok: false, status: 400, error: "unionId or newUnionName is required" };
  }
  const [row] = await db
    .select({
      id: unions.id,
      membershipPolicy: unions.membershipPolicy,
      archivedAt: unions.archivedAt,
    })
    .from(unions)
    .where(eq(unions.id, input.unionId))
    .limit(1);
  if (!row || row.archivedAt) {
    return { ok: false, status: 404, error: "Union not found" };
  }
  return {
    ok: true,
    unionId: row.id,
    policy: row.membershipPolicy ?? "multi_local",
    createdUnion: false,
  };
}

async function resolveLocal(input: {
  unionId: string;
  localId?: string;
  localNumber?: string;
  localSubText?: string;
  /** When union was just created with firstLocalNumber, prefer that local. */
  createdUnion: boolean;
}): Promise<
  | { ok: true; localId: string; createdLocal: boolean }
  | { ok: false; status: 400 | 404; error: string }
> {
  const db = getAssignDb();
  if (input.localId) {
    const [row] = await db
      .select({ id: locals.id, archivedAt: locals.archivedAt })
      .from(locals)
      .where(and(eq(locals.id, input.localId), eq(locals.unionId, input.unionId)))
      .limit(1);
    if (!row || row.archivedAt) {
      return { ok: false, status: 404, error: "Local not found" };
    }
    return { ok: true, localId: row.id, createdLocal: false };
  }
  const number = input.localNumber?.trim();
  if (!number) {
    if (input.createdUnion) {
      const [first] = await db
        .select({ id: locals.id })
        .from(locals)
        .where(and(eq(locals.unionId, input.unionId), isNull(locals.archivedAt)))
        .limit(1);
      if (first) return { ok: true, localId: first.id, createdLocal: true };
    }
    return {
      ok: false,
      status: 400,
      error: "localId or localNumber is required",
    };
  }
  const { local, created } = await findOrCreateLocal({
    unionId: input.unionId,
    localNumber: number,
    subText: input.localSubText,
  });
  return { ok: true, localId: local.id, createdLocal: created };
}

/**
 * Assign (or restore) a user’s primary local + active membership.
 * Intended for site-admin / elevated operators on Postgres.
 */
export async function assignUserLocal(
  input: AssignLocalInput,
): Promise<AssignLocalResult> {
  const db = getAssignDb();
  const usingOwnerDb = isOwnerDbConfigured();
  const [target] = await db
    .select({
      id: users.id,
      unionId: users.unionId,
      localId: users.localId,
      accessibleLocalIds: users.accessibleLocalIds,
      archivedAt: users.archivedAt,
      lockedAt: users.lockedAt,
    })
    .from(users)
    .where(eq(users.id, input.targetUserId))
    .limit(1);
  if (!target || target.archivedAt || target.lockedAt) {
    return { ok: false, status: 404, error: "User not found or inactive" };
  }

  const union = await resolveUnion(input);
  if (!union.ok) return union;

  const local = await resolveLocal({
    unionId: union.unionId,
    localId: input.localId,
    localNumber: input.localNumber,
    localSubText: input.localSubText,
    createdUnion: union.createdUnion,
  });
  if (!local.ok) return local;

  if (input.bargainingUnitId) {
    const [bu] = await db
      .select({ id: bargainingUnits.id })
      .from(bargainingUnits)
      .where(
        and(
          eq(bargainingUnits.id, input.bargainingUnitId),
          eq(bargainingUnits.unionId, union.unionId),
          eq(bargainingUnits.localId, local.localId),
        ),
      )
      .limit(1);
    if (!bu) {
      return { ok: false, status: 400, error: "Sub-group not found for this local" };
    }
  }

  const activeOthers = await db
    .select({
      id: localMemberships.id,
      localId: localMemberships.localId,
    })
    .from(localMemberships)
    .where(
      and(
        eq(localMemberships.unionId, union.unionId),
        eq(localMemberships.userId, target.id),
        eq(localMemberships.status, "active"),
        isNull(localMemberships.endedAt),
        sql`${localMemberships.localId} <> ${local.localId}`,
      ),
    );

  if (
    union.policy === "single_local" &&
    activeOthers.length > 0 &&
    !input.replaceActiveMembership
  ) {
    return {
      ok: false,
      status: 409,
      error:
        "This union allows only one active local per member. Confirm replace to move them.",
      code: "single_local_conflict",
      conflictingLocalIds: activeOthers.map((r) => r.localId),
    };
  }

  const setPrimary =
    input.setPrimary !== false ||
    !target.localId ||
    target.localId === local.localId;

  const replacedMembershipIds: string[] = [];
  const now = new Date();

  // #region agent log
  {
    const [actorRow] = await db
      .select({
        id: users.id,
        unionId: users.unionId,
        localId: users.localId,
        roles: users.roles,
      })
      .from(users)
      .where(eq(users.id, input.actorUserId))
      .limit(1);
    let gucs: unknown = null;
    let orgManage: unknown = null;
    try {
      gucs = await db.execute(sql`
        SELECT
          nullif(current_setting('app.current_union_id', true), '') AS current_union_id,
          nullif(current_setting('app.current_local_id', true), '') AS current_local_id,
          nullif(current_setting('app.current_user_id', true), '') AS current_user_id,
          current_setting('app.current_cross_local', true) AS current_cross_local,
          current_user AS db_user
      `);
      orgManage = await db.execute(
        sql`SELECT app_org_manage(${union.unionId}, ${local.localId}, ${"memberships.manage"}) AS can_manage`,
      );
    } catch (probeErr) {
      orgManage = {
        probeFailed: true,
        message: probeErr instanceof Error ? probeErr.message : String(probeErr),
      };
    }
    fetch("http://127.0.0.1:7911/ingest/3d68b2c0-ac88-4c57-b4e8-72926e068c79", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "9d35a6",
      },
      body: JSON.stringify({
        sessionId: "9d35a6",
        runId: "post-fix",
        hypothesisId: "A-RLS",
        location: "assign-local.ts:pre-tx",
        message: "assignUserLocal pre-transaction RLS probe",
        data: {
          actorUserId: input.actorUserId,
          targetUserId: input.targetUserId,
          actorUnionId: actorRow?.unionId ?? null,
          actorLocalId: actorRow?.localId ?? null,
          actorRoles: actorRow?.roles ?? null,
          targetUnionId: union.unionId,
          targetLocalId: local.localId,
          actorUnionMatchesTarget: actorRow?.unionId === union.unionId,
          createdUnion: union.createdUnion,
          createdLocal: local.createdLocal,
          setPrimary,
          bargainingUnitId: input.bargainingUnitId ?? null,
          usingOwnerDb,
          gucs,
          orgManage,
          hasRlsTx: Boolean(getRlsTxSafe()),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  const membershipId = await db.transaction(async (tx) => {
    // App-role fallback: bind RLS GUCs so same-union platform_admin can insert.
    // Cross-union / new-union still needs MIGRATE_DATABASE_URL (owner) above.
    if (!usingOwnerDb) {
      await applyRlsContext(tx, {
        unionId: union.unionId,
        localId: local.localId,
        userId: input.actorUserId,
        crossLocal: true,
        mfaVerified: true,
      });
    }
    if (union.policy === "single_local" && activeOthers.length > 0) {
      for (const other of activeOthers) {
        await tx
          .update(localMemberships)
          .set({
            status: "inactive",
            endedAt: now,
            isPrimary: false,
          })
          .where(eq(localMemberships.id, other.id));
        replacedMembershipIds.push(other.id);
        await tx.execute(
          sql`SELECT app_revoke_local_portal_membership(${union.unionId}, ${other.localId}, ${target.id})`,
        );
      }
    }

    if (setPrimary) {
      await tx
        .update(localMemberships)
        .set({ isPrimary: false })
        .where(
          and(
            eq(localMemberships.unionId, union.unionId),
            eq(localMemberships.userId, target.id),
          ),
        );
    }

    const [existing] = await tx
      .select()
      .from(localMemberships)
      .where(
        and(
          eq(localMemberships.userId, target.id),
          eq(localMemberships.localId, local.localId),
          eq(localMemberships.unionId, union.unionId),
        ),
      )
      .limit(1);

    let membershipRowId: string;
    if (existing) {
      try {
        const [updated] = await tx
          .update(localMemberships)
          .set({
            status: "active",
            startedAt: now,
            endedAt: null,
            isPrimary: setPrimary,
            bargainingUnitId: input.bargainingUnitId ?? existing.bargainingUnitId,
          })
          .where(eq(localMemberships.id, existing.id))
          .returning({ id: localMemberships.id });
        membershipRowId = updated.id;
      } catch (updateErr) {
        // #region agent log
        fetch("http://127.0.0.1:7911/ingest/3d68b2c0-ac88-4c57-b4e8-72926e068c79", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "9d35a6",
          },
          body: JSON.stringify({
            sessionId: "9d35a6",
            runId: "pre-fix",
            hypothesisId: "B-UNIQUE-OR-RLS-UPDATE",
            location: "assign-local.ts:update",
            message: "local_memberships update failed",
            data: summarizeDbError(updateErr, {
              path: "update",
              existingId: existing.id,
              unionId: union.unionId,
              localId: local.localId,
            }),
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        throw updateErr;
      }
    } else {
      const id = randomUUID();
      try {
        await tx.insert(localMemberships).values({
          id,
          unionId: union.unionId,
          localId: local.localId,
          userId: target.id,
          bargainingUnitId: input.bargainingUnitId ?? null,
          status: "active",
          isPrimary: setPrimary,
          startedAt: now,
          createdById: input.actorUserId,
        });
      } catch (insertErr) {
        // #region agent log
        fetch("http://127.0.0.1:7911/ingest/3d68b2c0-ac88-4c57-b4e8-72926e068c79", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "9d35a6",
          },
          body: JSON.stringify({
            sessionId: "9d35a6",
            runId: "pre-fix",
            hypothesisId: "A-RLS",
            location: "assign-local.ts:insert",
            message: "local_memberships insert failed",
            data: summarizeDbError(insertErr, {
              path: "insert",
              membershipId: id,
              unionId: union.unionId,
              localId: local.localId,
              userId: target.id,
              actorUserId: input.actorUserId,
              bargainingUnitId: input.bargainingUnitId ?? null,
              isPrimary: setPrimary,
            }),
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        throw insertErr;
      }
      membershipRowId = id;
    }

    const accessible = Array.isArray(target.accessibleLocalIds)
      ? target.accessibleLocalIds
      : [];
    const nextAccessible = [
      ...new Set([
        ...accessible.filter((id) =>
          union.policy === "single_local"
            ? id === local.localId ||
              !activeOthers.some((o) => o.localId === id)
            : true,
        ),
        local.localId,
      ]),
    ];

    await tx
      .update(users)
      .set({
        unionId: union.unionId,
        localId: setPrimary ? local.localId : target.localId ?? local.localId,
        ...(input.bargainingUnitId !== undefined
          ? { bargainingUnitId: input.bargainingUnitId }
          : {}),
        accessibleLocalIds: nextAccessible,
      })
      .where(eq(users.id, target.id));
    await tx.execute(
      sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${target.id}`,
    );

    await tx.execute(
      sql`SELECT app_sync_local_portal_membership(${union.unionId}, ${local.localId}, ${target.id})`,
    );

    return membershipRowId;
  });

  return {
    ok: true,
    unionId: union.unionId,
    localId: local.localId,
    membershipId,
    membershipPolicy: union.policy,
    createdLocal: local.createdLocal,
    createdUnion: union.createdUnion,
    replacedMembershipIds,
  };
}

export async function updateUnionMembershipPolicy(
  unionId: string,
  policy: MembershipPolicy,
): Promise<{ ok: true } | { ok: false; status: 400 | 404; error: string }> {
  if (policy !== "multi_local" && policy !== "single_local") {
    return { ok: false, status: 400, error: "Invalid membership policy" };
  }
  const db = getDb();
  const [row] = await db
    .select({ id: unions.id })
    .from(unions)
    .where(eq(unions.id, unionId))
    .limit(1);
  if (!row) return { ok: false, status: 404, error: "Union not found" };
  await db
    .update(unions)
    .set({ membershipPolicy: policy })
    .where(eq(unions.id, unionId));
  return { ok: true };
}
