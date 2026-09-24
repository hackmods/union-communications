import { and, eq, isNull, or, gt, lte } from "drizzle-orm";
import type { Session } from "next-auth";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { authorityDelegations, localMemberships, officerAssignments } from "@/lib/db/schema";
import { users } from "@/lib/db/schema/tenant";
import {
  actorFromSession,
  mergeRoleClaimBridge,
  type AuthorizationActor,
  type Capability,
} from "./model";

export async function resolveAuthorizationActor(session: Session): Promise<AuthorizationActor> {
  const actor = actorFromSession(session);
  if (!isPostgresConfigured() || process.env.AUTH_USERS_BACKEND?.trim().toLowerCase() !== "postgres") {
    return actor;
  }
  const relationships = await withRlsContext(
    {
      unionId: session.user.unionId,
      localId: session.user.localId,
      userId: actor.userId,
    },
    async () => {
      const db = getDb();
      return Promise.all([
        db
          .select({
            roles: users.roles,
            archivedAt: users.archivedAt,
            lockedAt: users.lockedAt,
            unionId: users.unionId,
            localId: users.localId,
            divisionId: users.divisionId,
            bargainingUnitId: users.bargainingUnitId,
            sessionVersion: users.sessionVersion,
          })
          .from(users)
          .where(eq(users.id, actor.userId))
          .limit(1),
        db
          .select()
          .from(localMemberships)
          .where(
            and(
              eq(localMemberships.userId, actor.userId),
              eq(localMemberships.status, "active"),
              isNull(localMemberships.endedAt),
              lte(localMemberships.startedAt, new Date()),
            ),
          ),
        db
          .select()
          .from(officerAssignments)
          .where(
            and(
              eq(officerAssignments.userId, actor.userId),
              isNull(officerAssignments.revokedAt),
              lte(officerAssignments.startsAt, new Date()),
              or(
                isNull(officerAssignments.endsAt),
                gt(officerAssignments.endsAt, new Date()),
              ),
            ),
          ),
        db
          .select()
          .from(authorityDelegations)
          .where(
            and(
              eq(authorityDelegations.delegateUserId, actor.userId),
              isNull(authorityDelegations.revokedAt),
              lte(authorityDelegations.startsAt, new Date()),
              gt(authorityDelegations.endsAt, new Date()),
            ),
          ),
      ]);
    },
  );
  const [userRows, memberships, assignments, delegations] = relationships;
  const user = userRows[0];
  if (!user) {
    return {
      ...actor,
      accountActive: false,
      memberships: [],
      assignments: [],
      delegations: [],
      source: "database",
    };
  }

  const roles = (user.roles ?? []) as AuthorizationActor["roles"];
  const bridged = mergeRoleClaimBridge({
    unionId: user.unionId,
    localId: user.localId,
    bargainingUnitId: user.bargainingUnitId,
    roles,
    memberships: memberships.map((m) => ({
      unionId: m.unionId,
      localId: m.localId,
      bargainingUnitId: m.bargainingUnitId ?? undefined,
      isPrimary: m.isPrimary,
    })),
    assignments: assignments.map((a) => ({
      unionId: a.unionId,
      localId: a.localId,
      position: a.position,
    })),
  });

  const sessionLocalId = session.user.localId;
  const activeMembership =
    bridged.memberships.find(
      (membership) =>
        membership.unionId === user.unionId &&
        (!sessionLocalId || membership.localId === sessionLocalId),
    ) ??
    bridged.memberships.find((membership) => membership.isPrimary) ??
    bridged.memberships[0];

  return {
    ...actor,
    unionId: user.unionId ?? undefined,
    divisionId: user.divisionId ?? undefined,
    activeLocalId: activeMembership?.localId ?? user.localId ?? undefined,
    bargainingUnitId:
      activeMembership?.bargainingUnitId ??
      user.bargainingUnitId ??
      undefined,
    roles,
    memberships: bridged.memberships,
    assignments: bridged.assignments,
    delegations: delegations.map((d) => ({
      unionId: d.unionId,
      localId: d.localId,
      capability: d.capability as Capability,
      grantorUserId: d.grantorUserId,
      endsAt: d.endsAt.toISOString(),
    })),
    accountActive:
      user.archivedAt === null &&
      user.lockedAt === null &&
      user.sessionVersion === (session.user.sessionVersion ?? 0),
    source: "database",
  };
}
