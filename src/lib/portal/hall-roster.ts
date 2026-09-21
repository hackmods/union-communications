import { DEMO_USERS } from "@/lib/auth/demo-users";
import { isDemoAuthEnabled } from "@/lib/auth/demo-auth-gate";
import { listInvitedUsersForLocal } from "@/lib/auth/invites";
import type { RlsSessionContext } from "@/lib/db/rls-context";
import { portalDbBackend } from "@/lib/db/backend";
import { canCreateCircle } from "@/lib/portal/access";
import { getPortalAdapter } from "@/lib/portal/adapter";
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
 * Demo/invited roster used only by memory mode. Durable Hall enrollment is
 * materialized from normalized local memberships by the database function.
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

  return [...byId.values()];
}

/** Recreate Hall and join everyone we know for this local, then the visitor. */
export async function hydrateLocalHall(input: {
  unionId: string;
  localId: string;
  localNumber?: string;
  currentUser: HallRosterPerson;
  rls?: RlsSessionContext;
}): Promise<{ circle: Circle }> {
  const portal = await getPortalAdapter(input.rls);
  if (portalDbBackend() === "postgres") {
    const { circle } = await portal.ensureHallAndJoin({
      unionId: input.unionId,
      localId: input.localId,
      localNumber: input.localNumber,
      userId: input.currentUser.userId,
      userName: input.currentUser.userName,
      admin: input.currentUser.admin,
    });
    return { circle };
  }
  await portal.ensureHall({
    unionId: input.unionId,
    localId: input.localId,
    localNumber: input.localNumber,
  });
  const people = await listLocalHallPeople(input.unionId, input.localId);
  for (const person of people) {
    await portal.ensureHallAndJoin({
      unionId: input.unionId,
      localId: input.localId,
      localNumber: input.localNumber,
      userId: person.userId,
      userName: person.userName,
      admin: person.admin,
    });
  }
  return portal.ensureHallAndJoin({
    unionId: input.unionId,
    localId: input.localId,
    localNumber: input.localNumber,
    userId: input.currentUser.userId,
    userName: input.currentUser.userName,
    admin: input.currentUser.admin,
  });
}
