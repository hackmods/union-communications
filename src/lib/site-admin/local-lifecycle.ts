/**
 * Site-admin local lifecycle: edit fields, empty hard-delete after archive.
 *
 * Soft archive/restore stay on the existing archive/restore routes.
 * Hard delete never cascades casework — refuse when attachments remain.
 */
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb, isPostgresConfigured, type Db } from "@/lib/db/client";
import {
  bargainingUnits,
  locals,
  users,
} from "@/lib/db/schema/tenant";
import { localMemberships } from "@/lib/db/schema/organization-access";
import { userInvites } from "@/lib/db/schema/auth";
import { updateOverlayLocal, removeOverlayLocal } from "@/lib/tenant/overlay";
import type { LifecycleResult } from "@/lib/site-admin/union-lifecycle";

/** Tables that carry local_id and block hard-delete when any rows remain. */
const LOCAL_CASEWORK_TABLES: readonly string[] = [
  "grievances",
  "discussion_threads",
  "union_meetings",
  "tasks",
  "poll_definitions",
  "documents",
  "attachment_meta",
  "committees",
  "officer_roster",
  "informal_log_entries",
  "officer_learning_users",
  "officer_learning_local_settings",
];

export type LocalAttachmentCounts = {
  users: number;
  memberships: number;
  invites: number;
  bargainingUnits: number;
  casework: number;
};

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

async function countLocalCasework(db: Db, localId: string): Promise<number> {
  let total = 0;
  for (const table of LOCAL_CASEWORK_TABLES) {
    try {
      const result = await db.execute(
        sql`SELECT count(*)::int AS n FROM ${sql.raw(`"${table}"`)} WHERE local_id = ${localId}`,
      );
      const rows = (
        Array.isArray(result)
          ? result
          : ((result as { rows?: unknown }).rows ?? [])
      ) as Array<{ n: number }>;
      total += Number(rows[0]?.n ?? 0);
    } catch {
      // Table may not exist in slim test DBs — ignore missing relations.
    }
  }
  return total;
}

export async function countLocalAttachments(
  localId: string,
): Promise<LocalAttachmentCounts> {
  const db = getDb();
  const [userTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.localId, localId));
  const [membershipTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(localMemberships)
    .where(eq(localMemberships.localId, localId));
  const [inviteTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(userInvites)
    .where(eq(userInvites.localId, localId));
  const [unitTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bargainingUnits)
    .where(eq(bargainingUnits.localId, localId));
  const casework = await countLocalCasework(db, localId);
  return {
    users: userTotal?.n ?? 0,
    memberships: membershipTotal?.n ?? 0,
    invites: inviteTotal?.n ?? 0,
    bargainingUnits: unitTotal?.n ?? 0,
    casework,
  };
}

export function isLocalEmpty(counts: LocalAttachmentCounts): boolean {
  return (
    counts.users === 0 &&
    counts.memberships === 0 &&
    counts.invites === 0 &&
    counts.bargainingUnits === 0 &&
    counts.casework === 0
  );
}

export async function updateLocalFields(
  localId: string,
  patch: {
    localNumber?: string;
    subText?: string;
    divisionId?: string | null;
  },
): Promise<
  LifecycleResult<{
    localNumber: string;
    subText: string;
    divisionId: string | null;
  }>
> {
  const gate = requirePostgres();
  if (gate) return gate;
  const db = getDb();
  const [existing] = await db
    .select({
      id: locals.id,
      unionId: locals.unionId,
      localNumber: locals.localNumber,
      subText: locals.subText,
      divisionId: locals.divisionId,
      archivedAt: locals.archivedAt,
    })
    .from(locals)
    .where(eq(locals.id, localId))
    .limit(1);
  if (!existing) {
    return { ok: false, status: 404, error: "Local not found" };
  }

  const localNumber =
    patch.localNumber !== undefined
      ? patch.localNumber.trim()
      : existing.localNumber;
  if (!localNumber) {
    return {
      ok: false,
      status: 400,
      error: "Local number is required",
      code: "number_required",
    };
  }
  const subText =
    patch.subText !== undefined ? patch.subText.trim() : existing.subText;
  const divisionId =
    patch.divisionId !== undefined
      ? patch.divisionId
      : (existing.divisionId ?? null);

  if (localNumber !== existing.localNumber && !existing.archivedAt) {
    const [collision] = await db
      .select({ id: locals.id })
      .from(locals)
      .where(
        and(
          eq(locals.unionId, existing.unionId),
          eq(locals.localNumber, localNumber),
          isNull(locals.archivedAt),
          ne(locals.id, localId),
        ),
      )
      .limit(1);
    if (collision) {
      return {
        ok: false,
        status: 409,
        error: "Another active local already uses this number",
        code: "number_taken",
      };
    }
  }

  await db
    .update(locals)
    .set({
      localNumber,
      subText,
      divisionId,
    })
    .where(eq(locals.id, localId));

  updateOverlayLocal(existing.unionId, localId, {
    localNumber,
    subText,
    divisionId,
  });

  return {
    ok: true,
    data: { localNumber, subText, divisionId },
  };
}

export async function hardDeleteEmptyLocal(
  localId: string,
  confirmNumber: string,
  actorUserId: string,
): Promise<LifecycleResult<{ deletedId: string }>> {
  const gate = requirePostgres();
  if (gate) return gate;
  const db = getDb();
  const [existing] = await db
    .select({
      id: locals.id,
      unionId: locals.unionId,
      localNumber: locals.localNumber,
      archivedAt: locals.archivedAt,
    })
    .from(locals)
    .where(eq(locals.id, localId))
    .limit(1);
  if (!existing) {
    return { ok: false, status: 404, error: "Local not found" };
  }
  if (!existing.archivedAt) {
    return {
      ok: false,
      status: 400,
      error: "Archive the local before deleting it",
      code: "archive_required",
    };
  }
  if (confirmNumber.trim() !== existing.localNumber) {
    return {
      ok: false,
      status: 400,
      error: "Confirmation number does not match",
      code: "confirm_mismatch",
    };
  }
  const counts = await countLocalAttachments(localId);
  if (!isLocalEmpty(counts)) {
    return {
      ok: false,
      status: 409,
      error:
        "Delete blocked: users, memberships, invites, collections, or casework are still attached. Clear those first, or use demo cleanup if this is a demo local.",
      code: "not_empty",
    };
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(locals)
      .set({
        archivedAt: existing.archivedAt ?? now,
        archivedById: actorUserId,
      })
      .where(eq(locals.id, localId));
    await tx.delete(locals).where(eq(locals.id, localId));
  });
  removeOverlayLocal(existing.unionId, localId);
  return { ok: true, data: { deletedId: localId } };
}
