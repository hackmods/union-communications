/**
 * Site-admin bargaining-collective (Division) lifecycle:
 * rename/edit code+name, soft-archive/restore, empty hard-delete.
 */
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { divisions, locals, users } from "@/lib/db/schema/tenant";
import {
  removeOverlayDivision,
  updateOverlayDivision,
  importOverlayDivision,
} from "@/lib/tenant/overlay";
import type { HubModule } from "@/types/tenant";
import type { LifecycleResult } from "@/lib/site-admin/union-lifecycle";

export type CollectiveAttachmentCounts = {
  locals: number;
  activeLocals: number;
  users: number;
};

export type CollectiveLifecycleRow = {
  id: string;
  unionId: string;
  code: string;
  name: string;
  archivedAt: string | null;
  localCount: number;
  activeLocalCount: number;
  userCount: number;
  empty: boolean;
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

export async function countCollectiveAttachments(
  collectiveId: string,
): Promise<CollectiveAttachmentCounts> {
  const db = getDb();
  const [localTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(locals)
    .where(eq(locals.divisionId, collectiveId));
  const [localActive] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(locals)
    .where(
      and(eq(locals.divisionId, collectiveId), isNull(locals.archivedAt)),
    );
  const [userTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.divisionId, collectiveId));
  return {
    locals: localTotal?.n ?? 0,
    activeLocals: localActive?.n ?? 0,
    users: userTotal?.n ?? 0,
  };
}

export function isCollectiveEmpty(
  counts: CollectiveAttachmentCounts,
): boolean {
  return counts.locals === 0 && counts.users === 0;
}

export async function listCollectivesForUnion(
  unionId: string,
): Promise<CollectiveLifecycleRow[]> {
  const gate = requirePostgres();
  if (gate) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: divisions.id,
      unionId: divisions.unionId,
      code: divisions.code,
      name: divisions.name,
      archivedAt: divisions.archivedAt,
    })
    .from(divisions)
    .where(eq(divisions.unionId, unionId))
    .orderBy(asc(divisions.name));

  return Promise.all(
    rows.map(async (row) => {
      const counts = await countCollectiveAttachments(row.id);
      return {
        id: row.id,
        unionId: row.unionId,
        code: row.code,
        name: row.name,
        archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
        localCount: counts.locals,
        activeLocalCount: counts.activeLocals,
        userCount: counts.users,
        empty: isCollectiveEmpty(counts),
      };
    }),
  );
}

export async function updateCollectiveFields(
  collectiveId: string,
  patch: { code?: string; name?: string },
): Promise<LifecycleResult<{ code: string; name: string }>> {
  const gate = requirePostgres();
  if (gate) return gate;
  const db = getDb();
  const [existing] = await db
    .select({
      id: divisions.id,
      unionId: divisions.unionId,
      code: divisions.code,
      name: divisions.name,
      archivedAt: divisions.archivedAt,
    })
    .from(divisions)
    .where(eq(divisions.id, collectiveId))
    .limit(1);
  if (!existing) {
    return { ok: false, status: 404, error: "Collective not found" };
  }

  const code =
    patch.code !== undefined
      ? patch.code.trim().toLowerCase()
      : existing.code;
  const name =
    patch.name !== undefined ? patch.name.trim() : existing.name;
  if (!code || !name) {
    return {
      ok: false,
      status: 400,
      error: "Code and name are required",
      code: "fields_required",
    };
  }

  if (code !== existing.code && !existing.archivedAt) {
    const [collision] = await db
      .select({ id: divisions.id })
      .from(divisions)
      .where(
        and(
          eq(divisions.unionId, existing.unionId),
          sql`lower(${divisions.code}) = lower(${code})`,
          isNull(divisions.archivedAt),
          ne(divisions.id, collectiveId),
        ),
      )
      .limit(1);
    if (collision) {
      return {
        ok: false,
        status: 409,
        error: "Another active collective already uses this code",
        code: "code_taken",
      };
    }
  }

  await db
    .update(divisions)
    .set({ code, name })
    .where(eq(divisions.id, collectiveId));
  updateOverlayDivision(existing.unionId, collectiveId, { code, name });
  return { ok: true, data: { code, name } };
}

export async function archiveCollective(
  collectiveId: string,
  actorUserId: string,
): Promise<LifecycleResult<{ archivedAt: string }>> {
  const gate = requirePostgres();
  if (gate) return gate;
  const db = getDb();
  const [existing] = await db
    .select({
      id: divisions.id,
      unionId: divisions.unionId,
      archivedAt: divisions.archivedAt,
    })
    .from(divisions)
    .where(eq(divisions.id, collectiveId))
    .limit(1);
  if (!existing) {
    return { ok: false, status: 404, error: "Collective not found" };
  }
  if (existing.archivedAt) {
    return {
      ok: true,
      data: { archivedAt: existing.archivedAt.toISOString() },
    };
  }
  const now = new Date();
  await db
    .update(divisions)
    .set({ archivedAt: now, archivedById: actorUserId })
    .where(eq(divisions.id, collectiveId));
  removeOverlayDivision(existing.unionId, collectiveId);
  return { ok: true, data: { archivedAt: now.toISOString() } };
}

export async function restoreCollective(
  collectiveId: string,
): Promise<LifecycleResult<void>> {
  const gate = requirePostgres();
  if (gate) return gate;
  const db = getDb();
  const [existing] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, collectiveId))
    .limit(1);
  if (!existing) {
    return { ok: false, status: 404, error: "Collective not found" };
  }
  if (!existing.archivedAt) {
    return { ok: true, data: undefined };
  }
  const [codeClash] = await db
    .select({ id: divisions.id })
    .from(divisions)
    .where(
      and(
        eq(divisions.unionId, existing.unionId),
        sql`lower(${divisions.code}) = lower(${existing.code})`,
        isNull(divisions.archivedAt),
        ne(divisions.id, collectiveId),
      ),
    )
    .limit(1);
  if (codeClash) {
    return {
      ok: false,
      status: 409,
      error:
        "Another active collective already uses this code. Rename one before restoring.",
      code: "code_taken",
    };
  }
  await db
    .update(divisions)
    .set({ archivedAt: null, archivedById: null })
    .where(eq(divisions.id, collectiveId));
  importOverlayDivision({
    id: existing.id,
    unionId: existing.unionId,
    code: existing.code,
    name: existing.name,
    enabledModules: (existing.enabledModules ?? []) as HubModule[],
  });
  return { ok: true, data: undefined };
}

export async function hardDeleteEmptyCollective(
  collectiveId: string,
  confirmCode: string,
  actorUserId: string,
): Promise<LifecycleResult<{ deletedId: string }>> {
  const gate = requirePostgres();
  if (gate) return gate;
  const db = getDb();
  const [existing] = await db
    .select({
      id: divisions.id,
      unionId: divisions.unionId,
      code: divisions.code,
      archivedAt: divisions.archivedAt,
    })
    .from(divisions)
    .where(eq(divisions.id, collectiveId))
    .limit(1);
  if (!existing) {
    return { ok: false, status: 404, error: "Collective not found" };
  }
  if (!existing.archivedAt) {
    return {
      ok: false,
      status: 400,
      error: "Archive the collective before deleting it",
      code: "archive_required",
    };
  }
  if (confirmCode.trim().toLowerCase() !== existing.code.toLowerCase()) {
    return {
      ok: false,
      status: 400,
      error: "Confirmation code does not match",
      code: "confirm_mismatch",
    };
  }
  const counts = await countCollectiveAttachments(collectiveId);
  if (!isCollectiveEmpty(counts)) {
    return {
      ok: false,
      status: 409,
      error:
        "Delete blocked: locals or users are still attached to this collective. Reassign or archive them first.",
      code: "not_empty",
    };
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(divisions)
      .set({
        archivedAt: existing.archivedAt ?? now,
        archivedById: actorUserId,
      })
      .where(eq(divisions.id, collectiveId));
    await tx.delete(divisions).where(eq(divisions.id, collectiveId));
  });
  removeOverlayDivision(existing.unionId, collectiveId);
  return { ok: true, data: { deletedId: collectiveId } };
}
