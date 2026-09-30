/**
 * Site Admin in-place Local Move — reparent a local to another union while
 * keeping `locals.id` stable so accounts and casework follow automatically.
 *
 * Requires owner DB (`MIGRATE_DATABASE_URL`) so RLS cannot hide rows mid-cascade.
 */
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb, isPostgresConfigured, type Db } from "@/lib/db/client";
import { getOwnerDb, isOwnerDbConfigured } from "@/lib/db/owner-client";
import {
  bargainingUnits,
  divisions,
  locals,
  unions,
  users,
  type MembershipPolicy,
} from "@/lib/db/schema/tenant";
import { localMemberships } from "@/lib/db/schema/organization-access";
import {
  importOverlayCollection,
  importOverlayLocal,
  removeOverlayCollection,
  removeOverlayLocal,
} from "@/lib/tenant/overlay";
import type { LifecycleResult } from "@/lib/site-admin/union-lifecycle";
import {
  LOCAL_MOVE_CIRCLE_CHILD_TABLES,
  LOCAL_MOVE_SCOPE_CHILD_TABLES,
  uniqueLocalMoveUnionIdTables,
} from "@/lib/site-admin/local-move-registry";

export type LocalMoveBlockCode =
  | "postgres_required"
  | "owner_db_required"
  | "local_not_found"
  | "destination_not_found"
  | "destination_archived"
  | "same_union"
  | "already_there"
  | "number_taken"
  | "number_required"
  | "division_invalid"
  | "demo_mismatch"
  | "data_identifier_collision"
  | "officer_learning_collision"
  | "single_local_conflict"
  | "confirm_mismatch"
  | "warnings_unacknowledged";

export type LocalMoveWarningCode =
  | "casework_present"
  | "invites_present"
  | "modules_differ"
  | "collective_cleared"
  | "demo_mismatch_ack";

export type LocalMoveCounts = {
  usersPrimary: number;
  memberships: number;
  invites: number;
  bargainingUnits: number;
  caseworkRows: number;
  portalCircles: number;
  tablesWithRows: number;
};

export type LocalMovePreview = {
  localId: string;
  fromUnionId: string;
  toUnionId: string;
  localNumber: string;
  effectiveLocalNumber: string;
  fromUnionName: string;
  toUnionName: string;
  fromIsDemo: boolean;
  toIsDemo: boolean;
  fromMembershipPolicy: MembershipPolicy;
  toMembershipPolicy: MembershipPolicy;
  counts: LocalMoveCounts;
  blocks: Array<{ code: LocalMoveBlockCode; detail?: string }>;
  warnings: Array<{ code: LocalMoveWarningCode; detail?: string }>;
  conflictingUserIds: string[];
  canMove: boolean;
};

export type LocalMoveInput = {
  localId: string;
  toUnionId: string;
  toDivisionId?: string | null;
  /** Optional rename to resolve active number collision in destination. */
  localNumber?: string;
  actorUserId: string;
  endOtherMembershipsInDestination?: boolean;
  allowDemoMismatch?: boolean;
  acknowledgeWarnings?: boolean;
  /** Typed confirm of the *current* local number (before optional rename). */
  confirmLocalNumber?: string;
};

export type LocalMoveResultData = {
  localId: string;
  fromUnionId: string;
  toUnionId: string;
  localNumber: string;
  divisionId: string | null;
  tablesTouched: number;
  usersBumped: number;
  invitesRewritten: number;
  caseworkRows: number;
  membershipsEnded: number;
};

function getMoveDb(): Db {
  return isOwnerDbConfigured() ? getOwnerDb() : getDb();
}

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

function requireOwnerDb(): LifecycleResult<never> | null {
  if (!isOwnerDbConfigured()) {
    return {
      ok: false,
      status: 503,
      error:
        "Owner database URL is required to move a local across unions (MIGRATE_DATABASE_URL).",
      code: "owner_db_required",
    };
  }
  return null;
}

async function countTableForLocal(
  db: Db,
  table: string,
  localId: string,
  unionId: string,
): Promise<number> {
  try {
    const result = await db.execute(
      sql`SELECT count(*)::int AS n FROM ${sql.raw(`"${table}"`)} WHERE local_id = ${localId} AND union_id = ${unionId}`,
    );
    const rows = (
      Array.isArray(result)
        ? result
        : ((result as { rows?: unknown }).rows ?? [])
    ) as Array<{ n: number }>;
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

async function buildCounts(
  db: Db,
  localId: string,
  fromUnionId: string,
): Promise<LocalMoveCounts> {
  const [userTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.localId, localId));
  const [membershipTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(localMemberships)
    .where(eq(localMemberships.localId, localId));
  const [inviteTotal] = await db.execute(
    sql`SELECT count(*)::int AS n FROM user_invites WHERE local_id = ${localId} AND union_id = ${fromUnionId}`,
  );
  const inviteRows = (
    Array.isArray(inviteTotal)
      ? inviteTotal
      : ((inviteTotal as { rows?: unknown }).rows ?? [])
  ) as Array<{ n: number }>;
  const [unitTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bargainingUnits)
    .where(eq(bargainingUnits.localId, localId));

  let caseworkRows = 0;
  let tablesWithRows = 0;
  for (const table of uniqueLocalMoveUnionIdTables()) {
    if (
      table === "bargaining_units" ||
      table === "local_memberships" ||
      table === "user_invites"
    ) {
      continue;
    }
    const n = await countTableForLocal(db, table, localId, fromUnionId);
    if (n > 0) {
      caseworkRows += n;
      tablesWithRows += 1;
    }
  }

  const portalCircles = await countTableForLocal(
    db,
    "portal_circles",
    localId,
    fromUnionId,
  );

  return {
    usersPrimary: userTotal?.n ?? 0,
    memberships: membershipTotal?.n ?? 0,
    invites: Number(inviteRows[0]?.n ?? 0),
    bargainingUnits: unitTotal?.n ?? 0,
    caseworkRows,
    portalCircles,
    tablesWithRows,
  };
}

async function findSingleLocalConflicts(
  db: Db,
  localId: string,
  toUnionId: string,
  policy: MembershipPolicy,
): Promise<string[]> {
  if (policy !== "single_local") return [];
  const members = await db
    .select({ userId: localMemberships.userId })
    .from(localMemberships)
    .where(
      and(
        eq(localMemberships.localId, localId),
        eq(localMemberships.status, "active"),
        isNull(localMemberships.endedAt),
      ),
    );
  if (members.length === 0) return [];
  const userIds = members.map((m) => m.userId);
  const conflicts = await db
    .select({ userId: localMemberships.userId })
    .from(localMemberships)
    .where(
      and(
        eq(localMemberships.unionId, toUnionId),
        eq(localMemberships.status, "active"),
        isNull(localMemberships.endedAt),
        inArray(localMemberships.userId, userIds),
        ne(localMemberships.localId, localId),
      ),
    );
  return [...new Set(conflicts.map((c) => c.userId))];
}

async function countDataIdentifierCollisions(
  db: Db,
  localId: string,
  fromUnionId: string,
  toUnionId: string,
): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS n
    FROM data_identifiers src
    WHERE src.local_id = ${localId}
      AND src.union_id = ${fromUnionId}
      AND EXISTS (
        SELECT 1 FROM data_identifiers dest
        WHERE dest.union_id = ${toUnionId}
          AND dest.namespace = src.namespace
          AND dest.value = src.value
          AND dest.local_id <> ${localId}
      )
  `);
  const rows = (
    Array.isArray(result) ? result : ((result as { rows?: unknown }).rows ?? [])
  ) as Array<{ n: number }>;
  return Number(rows[0]?.n ?? 0);
}

async function countOfficerLearningCollisions(
  db: Db,
  localId: string,
  toUnionId: string,
): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS n
    FROM officer_learning_users src
    WHERE src.local_id = ${localId}
      AND EXISTS (
        SELECT 1 FROM officer_learning_users dest
        WHERE dest.union_id = ${toUnionId}
          AND dest.user_id = src.user_id
          AND dest.local_id <> ${localId}
      )
  `);
  const rows = (
    Array.isArray(result) ? result : ((result as { rows?: unknown }).rows ?? [])
  ) as Array<{ n: number }>;
  return Number(rows[0]?.n ?? 0);
}

export async function previewLocalMove(input: {
  localId: string;
  toUnionId: string;
  toDivisionId?: string | null;
  localNumber?: string;
  endOtherMembershipsInDestination?: boolean;
  allowDemoMismatch?: boolean;
}): Promise<LifecycleResult<LocalMovePreview>> {
  const pg = requirePostgres();
  if (pg) return pg;
  const owner = requireOwnerDb();
  if (owner) return owner;

  const db = getMoveDb();
  const [local] = await db
    .select({
      id: locals.id,
      unionId: locals.unionId,
      localNumber: locals.localNumber,
      divisionId: locals.divisionId,
      archivedAt: locals.archivedAt,
      isDemo: locals.isDemo,
      subText: locals.subText,
    })
    .from(locals)
    .where(eq(locals.id, input.localId))
    .limit(1);
  if (!local) {
    return { ok: false, status: 404, error: "Local not found", code: "local_not_found" };
  }

  const [fromUnion] = await db
    .select({
      id: unions.id,
      name: unions.name,
      isDemo: unions.isDemo,
      membershipPolicy: unions.membershipPolicy,
      enabledModules: unions.enabledModules,
      archivedAt: unions.archivedAt,
      commsPresetId: unions.commsPresetId,
    })
    .from(unions)
    .where(eq(unions.id, local.unionId))
    .limit(1);

  const [toUnion] = await db
    .select({
      id: unions.id,
      name: unions.name,
      isDemo: unions.isDemo,
      membershipPolicy: unions.membershipPolicy,
      enabledModules: unions.enabledModules,
      archivedAt: unions.archivedAt,
      commsPresetId: unions.commsPresetId,
    })
    .from(unions)
    .where(eq(unions.id, input.toUnionId))
    .limit(1);

  const blocks: LocalMovePreview["blocks"] = [];
  const warnings: LocalMovePreview["warnings"] = [];

  if (!toUnion) {
    blocks.push({ code: "destination_not_found" });
  } else if (toUnion.archivedAt) {
    blocks.push({ code: "destination_archived" });
  }

  if (local.unionId === input.toUnionId) {
    blocks.push({ code: "already_there" });
  }

  const effectiveNumber =
    input.localNumber !== undefined
      ? input.localNumber.trim()
      : local.localNumber;
  if (!effectiveNumber) {
    blocks.push({ code: "number_required" });
  }

  if (toUnion && !toUnion.archivedAt && effectiveNumber) {
    const [collision] = await db
      .select({ id: locals.id })
      .from(locals)
      .where(
        and(
          eq(locals.unionId, input.toUnionId),
          eq(locals.localNumber, effectiveNumber),
          isNull(locals.archivedAt),
          ne(locals.id, local.id),
        ),
      )
      .limit(1);
    if (collision) {
      blocks.push({
        code: "number_taken",
        detail: effectiveNumber,
      });
    }
  }

  const toDivisionId =
    input.toDivisionId === undefined ? null : input.toDivisionId;
  if (toDivisionId) {
    const [div] = await db
      .select({ id: divisions.id, unionId: divisions.unionId })
      .from(divisions)
      .where(eq(divisions.id, toDivisionId))
      .limit(1);
    if (!div || div.unionId !== input.toUnionId) {
      blocks.push({ code: "division_invalid" });
    }
  } else if (local.divisionId) {
    warnings.push({ code: "collective_cleared" });
  }

  const demoMismatch = Boolean(
    fromUnion && toUnion && fromUnion.isDemo !== toUnion.isDemo,
  ) || (toUnion && local.isDemo !== toUnion.isDemo);
  if (demoMismatch && !input.allowDemoMismatch) {
    blocks.push({ code: "demo_mismatch" });
  } else if (demoMismatch) {
    warnings.push({ code: "demo_mismatch_ack" });
  }

  const counts = await buildCounts(db, local.id, local.unionId);
  if (counts.caseworkRows > 0 || counts.portalCircles > 0) {
    warnings.push({
      code: "casework_present",
      detail: String(counts.caseworkRows + counts.portalCircles),
    });
  }
  if (counts.invites > 0) {
    warnings.push({
      code: "invites_present",
      detail: String(counts.invites),
    });
  }
  if (
    fromUnion &&
    toUnion &&
    (JSON.stringify(fromUnion.enabledModules ?? []) !==
      JSON.stringify(toUnion.enabledModules ?? []) ||
      (fromUnion.commsPresetId ?? null) !== (toUnion.commsPresetId ?? null))
  ) {
    warnings.push({ code: "modules_differ" });
  }

  const idCollisions = await countDataIdentifierCollisions(
    db,
    local.id,
    local.unionId,
    input.toUnionId,
  );
  if (idCollisions > 0) {
    blocks.push({
      code: "data_identifier_collision",
      detail: String(idCollisions),
    });
  }

  const olCollisions = await countOfficerLearningCollisions(
    db,
    local.id,
    input.toUnionId,
  );
  if (olCollisions > 0) {
    blocks.push({
      code: "officer_learning_collision",
      detail: String(olCollisions),
    });
  }

  const toPolicy =
    (toUnion?.membershipPolicy as MembershipPolicy | undefined) ?? "multi_local";
  const conflictingUserIds = toUnion
    ? await findSingleLocalConflicts(db, local.id, input.toUnionId, toPolicy)
    : [];
  if (
    conflictingUserIds.length > 0 &&
    !input.endOtherMembershipsInDestination
  ) {
    blocks.push({
      code: "single_local_conflict",
      detail: String(conflictingUserIds.length),
    });
  }

  return {
    ok: true,
    data: {
      localId: local.id,
      fromUnionId: local.unionId,
      toUnionId: input.toUnionId,
      localNumber: local.localNumber,
      effectiveLocalNumber: effectiveNumber,
      fromUnionName: fromUnion?.name ?? local.unionId,
      toUnionName: toUnion?.name ?? input.toUnionId,
      fromIsDemo: Boolean(fromUnion?.isDemo ?? local.isDemo),
      toIsDemo: Boolean(toUnion?.isDemo),
      fromMembershipPolicy:
        (fromUnion?.membershipPolicy as MembershipPolicy) ?? "multi_local",
      toMembershipPolicy: toPolicy,
      counts,
      blocks,
      warnings,
      conflictingUserIds,
      canMove: blocks.length === 0,
    },
  };
}

async function cascadeUnionId(
  tx: Db,
  localId: string,
  fromUnionId: string,
  toUnionId: string,
): Promise<{ tablesTouched: number; caseworkRows: number }> {
  let tablesTouched = 0;
  let caseworkRows = 0;

  // Circle children before circles (join still sees source union on circles).
  // Table / FK names come only from LOCAL_MOVE_CIRCLE_CHILD_TABLES allowlist.
  for (const { table, circleFk } of LOCAL_MOVE_CIRCLE_CHILD_TABLES) {
    try {
      const result = await tx.execute(sql`
        UPDATE ${sql.raw(`"${table}"`)} AS child
        SET union_id = ${toUnionId}
        FROM portal_circles AS c
        WHERE child.${sql.raw(`"${circleFk}"`)} = c.id
          AND c.local_id = ${localId}
          AND child.union_id = ${fromUnionId}
      `);
      const count = Number((result as { count?: number }).count ?? 0);
      if (count > 0) {
        tablesTouched += 1;
        caseworkRows += count;
      }
    } catch {
      // Table may be absent in slim test DBs.
    }
  }

  // Customization children via local-scoped scopes
  for (const table of LOCAL_MOVE_SCOPE_CHILD_TABLES) {
    try {
      const result = await tx.execute(sql`
        UPDATE ${sql.raw(`"${table}"`)} AS child
        SET union_id = ${toUnionId}
        FROM customization_scopes AS s
        WHERE child.scope_id = s.id
          AND s.local_id = ${localId}
          AND s.union_id = ${fromUnionId}
          AND child.union_id = ${fromUnionId}
      `);
      const count = Number((result as { count?: number }).count ?? 0);
      if (count > 0) {
        tablesTouched += 1;
        caseworkRows += count;
      }
    } catch {
      // Optional in slim DBs.
    }
  }

  for (const table of uniqueLocalMoveUnionIdTables()) {
    try {
      const result = await tx.execute(sql`
        UPDATE ${sql.raw(`"${table}"`)}
        SET union_id = ${toUnionId}
        WHERE local_id = ${localId}
          AND union_id = ${fromUnionId}
      `);
      const count = Number((result as { count?: number }).count ?? 0);
      if (count > 0) {
        tablesTouched += 1;
        caseworkRows += count;
      }
    } catch {
      // Optional in slim DBs.
    }
  }

  return { tablesTouched, caseworkRows };
}

/**
 * Execute an in-place local move. Call after preview confirms canMove
 * (or with the same flags that clear soft blocks).
 */
export async function executeLocalMove(
  input: LocalMoveInput,
): Promise<LifecycleResult<LocalMoveResultData>> {
  const pg = requirePostgres();
  if (pg) return pg;
  const owner = requireOwnerDb();
  if (owner) return owner;

  if (
    input.confirmLocalNumber !== undefined &&
    input.confirmLocalNumber.trim().length === 0
  ) {
    return {
      ok: false,
      status: 400,
      error: "Type the current local number to confirm the move",
      code: "confirm_mismatch",
    };
  }

  const preview = await previewLocalMove({
    localId: input.localId,
    toUnionId: input.toUnionId,
    toDivisionId: input.toDivisionId,
    localNumber: input.localNumber,
    endOtherMembershipsInDestination: input.endOtherMembershipsInDestination,
    allowDemoMismatch: input.allowDemoMismatch,
  });
  if (!preview.ok) return preview;

  if (
    input.confirmLocalNumber !== undefined &&
    input.confirmLocalNumber.trim() !== preview.data.localNumber
  ) {
    return {
      ok: false,
      status: 400,
      error: "Confirmation does not match the current local number",
      code: "confirm_mismatch",
    };
  }

  if (
    preview.data.warnings.length > 0 &&
    !input.acknowledgeWarnings
  ) {
    return {
      ok: false,
      status: 400,
      error: "Acknowledge move warnings before continuing",
      code: "warnings_unacknowledged",
    };
  }

  if (!preview.data.canMove) {
    const first = preview.data.blocks[0];
    return {
      ok: false,
      status: first?.code === "destination_not_found" ? 404 : 409,
      error: first?.code ?? "Move blocked",
      code: first?.code,
    };
  }

  const db = getMoveDb();
  const fromUnionId = preview.data.fromUnionId;
  const toUnionId = preview.data.toUnionId;
  const effectiveNumber = preview.data.effectiveLocalNumber;
  const toDivisionId =
    input.toDivisionId === undefined ? null : input.toDivisionId;
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const locked = await tx.execute(sql`
      SELECT id, union_id, local_number, division_id, sub_text, is_demo, archived_at
      FROM locals
      WHERE id = ${input.localId}
      FOR UPDATE
    `);
    const lockedRows = (
      Array.isArray(locked) ? locked : ((locked as { rows?: unknown }).rows ?? [])
    ) as Array<{
      id: string;
      union_id: string;
      local_number: string;
      division_id: string | null;
      sub_text: string;
      is_demo: boolean;
      archived_at: Date | null;
    }>;
    const row = lockedRows[0];
    if (!row) {
      throw Object.assign(new Error("Local not found"), {
        status: 404,
        code: "local_not_found",
      });
    }
    if (row.union_id !== fromUnionId) {
      throw Object.assign(new Error("Local union changed during move"), {
        status: 409,
        code: "same_union",
      });
    }

    // Re-check number collision under lock
    const [collision] = await tx
      .select({ id: locals.id })
      .from(locals)
      .where(
        and(
          eq(locals.unionId, toUnionId),
          eq(locals.localNumber, effectiveNumber),
          isNull(locals.archivedAt),
          ne(locals.id, input.localId),
        ),
      )
      .limit(1);
    if (collision) {
      throw Object.assign(new Error("Number taken"), {
        status: 409,
        code: "number_taken",
      });
    }

    let membershipsEnded = 0;
    if (
      input.endOtherMembershipsInDestination &&
      preview.data.conflictingUserIds.length > 0
    ) {
      for (const userId of preview.data.conflictingUserIds) {
        const others = await tx
          .select({
            id: localMemberships.id,
            localId: localMemberships.localId,
          })
          .from(localMemberships)
          .where(
            and(
              eq(localMemberships.unionId, toUnionId),
              eq(localMemberships.userId, userId),
              eq(localMemberships.status, "active"),
              isNull(localMemberships.endedAt),
              ne(localMemberships.localId, input.localId),
            ),
          );
        for (const other of others) {
          await tx
            .update(localMemberships)
            .set({
              status: "inactive",
              endedAt: now,
              isPrimary: false,
            })
            .where(eq(localMemberships.id, other.id));
          membershipsEnded += 1;
          await tx.execute(
            sql`SELECT app_revoke_local_portal_membership(${toUnionId}, ${other.localId}, ${userId})`,
          );
        }
      }
    }

    const cascade = await cascadeUnionId(
      tx,
      input.localId,
      fromUnionId,
      toUnionId,
    );

    await tx
      .update(locals)
      .set({
        unionId: toUnionId,
        localNumber: effectiveNumber,
        divisionId: toDivisionId,
      })
      .where(eq(locals.id, input.localId));

    // Primary users on this local
    const primaryUsers = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.localId, input.localId));

    // Membership users (may include non-primary)
    const memberUsers = await tx
      .select({ userId: localMemberships.userId })
      .from(localMemberships)
      .where(eq(localMemberships.localId, input.localId));

    const bumpIds = new Set<string>([
      ...primaryUsers.map((u) => u.id),
      ...memberUsers.map((m) => m.userId),
    ]);

    for (const userId of bumpIds) {
      const [u] = await tx
        .select({
          id: users.id,
          localId: users.localId,
          divisionId: users.divisionId,
          accessibleLocalIds: users.accessibleLocalIds,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!u) continue;

      const patch: {
        unionId?: string;
        divisionId?: string | null;
      } = {};
      if (u.localId === input.localId) {
        patch.unionId = toUnionId;
        if (u.divisionId && u.divisionId !== toDivisionId) {
          patch.divisionId = toDivisionId;
        }
      }
      if (Object.keys(patch).length > 0) {
        await tx.update(users).set(patch).where(eq(users.id, userId));
      }
      await tx.execute(
        sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${userId}`,
      );
      await tx.execute(
        sql`SELECT app_sync_local_portal_membership(${toUnionId}, ${input.localId}, ${userId})`,
      );
    }

    // Clear stale division on invites already rewritten by cascade
    if (toDivisionId === null) {
      await tx.execute(sql`
        UPDATE user_invites
        SET division_id = NULL
        WHERE local_id = ${input.localId}
          AND union_id = ${toUnionId}
      `);
    } else {
      await tx.execute(sql`
        UPDATE user_invites
        SET division_id = ${toDivisionId}
        WHERE local_id = ${input.localId}
          AND union_id = ${toUnionId}
      `);
    }

    return {
      localId: input.localId,
      fromUnionId,
      toUnionId,
      localNumber: effectiveNumber,
      divisionId: toDivisionId,
      tablesTouched: cascade.tablesTouched + 1,
      usersBumped: bumpIds.size,
      invitesRewritten: preview.data.counts.invites,
      caseworkRows: cascade.caseworkRows,
      membershipsEnded,
      subText: row.sub_text,
      isDemo: row.is_demo,
    };
  }).catch((err: unknown) => {
    const e = err as { status?: number; code?: string; message?: string };
    if (e.status && e.code) {
      return {
        ok: false as const,
        status: e.status as 400 | 404 | 409 | 503,
        error: e.message ?? "Move failed",
        code: e.code,
      };
    }
    throw err;
  });

  if (result && typeof result === "object" && "ok" in result && result.ok === false) {
    return result;
  }

  const moved = result as {
    localId: string;
    fromUnionId: string;
    toUnionId: string;
    localNumber: string;
    divisionId: string | null;
    tablesTouched: number;
    usersBumped: number;
    invitesRewritten: number;
    caseworkRows: number;
    membershipsEnded: number;
    subText: string;
    isDemo: boolean;
  };

  // Overlay rekey (process-local; non-durable)
  removeOverlayLocal(moved.fromUnionId, moved.localId);
  importOverlayLocal({
    id: moved.localId,
    unionId: moved.toUnionId,
    localNumber: moved.localNumber,
    subText: moved.subText ?? "",
    divisionId: moved.divisionId ?? undefined,
  });

  const units = await getMoveDb()
    .select({
      id: bargainingUnits.id,
      unionId: bargainingUnits.unionId,
      localId: bargainingUnits.localId,
      name: bargainingUnits.name,
      code: bargainingUnits.code,
    })
    .from(bargainingUnits)
    .where(eq(bargainingUnits.localId, moved.localId));
  for (const unit of units) {
    removeOverlayCollection(moved.fromUnionId, unit.id);
    importOverlayCollection({
      id: unit.id,
      unionId: moved.toUnionId,
      localId: unit.localId,
      name: unit.name,
      code: unit.code,
    });
  }

  return {
    ok: true,
    data: {
      localId: moved.localId,
      fromUnionId: moved.fromUnionId,
      toUnionId: moved.toUnionId,
      localNumber: moved.localNumber,
      divisionId: moved.divisionId,
      tablesTouched: moved.tablesTouched,
      usersBumped: moved.usersBumped,
      invitesRewritten: moved.invitesRewritten,
      caseworkRows: moved.caseworkRows,
      membershipsEnded: moved.membershipsEnded,
    },
  };
}

/** Test helper — expose collision count helpers. */
export const __localMoveTest = {
  countDataIdentifierCollisions,
  countOfficerLearningCollisions,
  findSingleLocalConflicts,
};
