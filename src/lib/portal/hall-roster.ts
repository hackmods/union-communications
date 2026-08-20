import { and, eq } from "drizzle-orm";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { isDemoAuthEnabled } from "@/lib/auth/demo-auth-gate";
import { listInvitedUsersForLocal } from "@/lib/auth/invites";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { canCreateCircle } from "@/lib/portal/access";
import { portalStore } from "@/lib/portal/memory-adapter";
import type { Circle } from "@/types/portal";
import type { UserRole } from "@/types/tenant";

export type HallRosterPerson = {
  userId: string;
  userName: string;
  admin: boolean;
};

function personFrom(user: {
  id: string;
  name: string;
  roles: readonly string[];
}): HallRosterPerson {
  return {
    userId: user.id,
    userName: user.name,
    admin: canCreateCircle(user.roles as UserRole[]),
  };
}

function addPerson(
  byId: Map<string, HallRosterPerson>,
  person: HallRosterPerson,
): void {
  if (!person.userId) return;
  const existing = byId.get(person.userId);
  if (!existing || (person.admin && !existing.admin)) {
    byId.set(person.userId, person);
  }
}

/**
 * People who belong on this local's Hall: demo roster (when enabled),
 * in-process invitees, and durable `users` rows when Postgres is configured.
 */
export async function listLocalHallPeople(
  unionId: string,
  localId: string,
): Promise<HallRosterPerson[]> {
  const byId = new Map<string, HallRosterPerson>();

  if (isDemoAuthEnabled()) {
    for (const user of DEMO_USERS) {
      if (user.unionId === unionId && user.localId === localId) {
        addPerson(byId, personFrom(user));
      }
    }
  }

  for (const user of listInvitedUsersForLocal(unionId, localId)) {
    addPerson(byId, personFrom(user));
  }

  if (isPostgresConfigured()) {
    try {
      const db = getDb();
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          roles: users.roles,
        })
        .from(users)
        .where(and(eq(users.unionId, unionId), eq(users.localId, localId)));
      for (const row of rows) {
        addPerson(byId, personFrom(row));
      }
    } catch {
      /* Memory Hall still works if the users table is unreachable. */
    }
  }

  return [...byId.values()];
}

/** Recreate Hall and join everyone we know for this local, then the visitor. */
export async function hydrateLocalHall(input: {
  unionId: string;
  localId: string;
  localNumber?: string;
  currentUser: HallRosterPerson;
}): Promise<{ circle: Circle }> {
  portalStore.ensureHall({
    unionId: input.unionId,
    localId: input.localId,
    localNumber: input.localNumber,
  });
  const people = await listLocalHallPeople(input.unionId, input.localId);
  for (const person of people) {
    portalStore.ensureHallAndJoin({
      unionId: input.unionId,
      localId: input.localId,
      localNumber: input.localNumber,
      userId: person.userId,
      userName: person.userName,
      admin: person.admin,
    });
  }
  return portalStore.ensureHallAndJoin({
    unionId: input.unionId,
    localId: input.localId,
    localNumber: input.localNumber,
    userId: input.currentUser.userId,
    userName: input.currentUser.userName,
    admin: input.currentUser.admin,
  });
}
