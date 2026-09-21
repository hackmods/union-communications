import { and, eq, isNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { withRlsContext, type RlsSessionContext } from "@/lib/db/rls-context";
import { localMemberships } from "@/lib/db/schema";
import { users } from "@/lib/db/schema/tenant";

export type ActiveGrievanceLocalMember = { id: string; name: string; email: string };

function activeMemberScope(unionId: string, localId: string, now: Date) {
  return and(
    eq(localMemberships.unionId, unionId),
    eq(localMemberships.localId, localId),
    eq(localMemberships.status, "active"),
    isNull(localMemberships.endedAt),
    lte(localMemberships.startedAt, now),
    eq(users.unionId, unionId),
    isNull(users.archivedAt),
    isNull(users.lockedAt),
  );
}

/**
 * List active, same-union local members for an authorized grievance workflow.
 * Callers must pass the actor's resolved RLS context; results never include
 * accounts that are archived, locked, cross-union, or outside the local.
 */
export async function listActiveGrievanceLocalMembers(input: {
  unionId: string;
  localId: string;
  rls: RlsSessionContext;
}): Promise<ActiveGrievanceLocalMember[]> {
  const now = new Date();
  return withRlsContext(input.rls, () => getDb().select({
    id: users.id,
    name: users.name,
    email: users.email,
  }).from(localMemberships)
    .innerJoin(users, eq(users.id, localMemberships.userId))
    .where(activeMemberScope(input.unionId, input.localId, now))
    .orderBy(users.name));
}

export async function hasActiveGrievanceLocalMember(input: {
  unionId: string;
  localId: string;
  userId: string;
  rls: RlsSessionContext;
}): Promise<boolean> {
  const now = new Date();
  const [member] = await withRlsContext(input.rls, () => getDb().select({ id: localMemberships.id })
    .from(localMemberships)
    .innerJoin(users, eq(users.id, localMemberships.userId))
    .where(and(activeMemberScope(input.unionId, input.localId, now), eq(users.id, input.userId)))
    .limit(1));
  return Boolean(member);
}
