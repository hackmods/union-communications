import { and, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
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
  const db = getDb();
  if (input.newUnionName?.trim()) {
    const seed = await createUnionDurable({
      name: input.newUnionName.trim(),
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
  const db = getDb();
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
  const db = getDb();
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

  const membershipId = await db.transaction(async (tx) => {
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
    } else {
      const id = randomUUID();
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
