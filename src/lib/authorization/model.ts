import type { Session } from "next-auth";
import type { OfficerPosition } from "@/lib/db/schema/organization-access";
import type { UserRole } from "@/types/tenant";

export type Capability =
  | "memberships.manage"
  | "officers.manage"
  | "delegations.manage"
  | "circles.create"
  | "circles.admin"
  | "grievances.summary.read"
  | "grievances.case.read"
  | "grievances.case.write"
  | "grievances.access.manage"
  | "grievances.member_updates.publish"
  | "tenant.configure"
  | "customization.readDraft"
  | "customization.edit"
  | "customization.publish"
  | "customization.policy.manage"
  | "customization.localParameters.edit"
  | "customization.grants.manage";

export type EffectiveMembership = {
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  isPrimary: boolean;
};

export type EffectiveAssignment = {
  unionId: string;
  localId: string;
  position: OfficerPosition;
};

export type EffectiveDelegation = {
  unionId: string;
  localId: string;
  capability: Capability;
  grantorUserId: string;
  endsAt: string;
};

export type AuthorizationActor = {
  userId: string;
  unionId?: string;
  divisionId?: string;
  activeLocalId?: string;
  bargainingUnitId?: string;
  roles: UserRole[];
  memberships: EffectiveMembership[];
  assignments: EffectiveAssignment[];
  delegations: EffectiveDelegation[];
  circleMemberships: Array<{ circleId: string; role: "viewer" | "member" | "admin" }>;
  mfaVerified: boolean;
  accountActive: boolean;
  source: "database" | "session";
};

export type AuthorizationDecision = {
  allowed: boolean;
  capability: Capability;
  reason: string;
  relationship?: string;
};

export function actorFromSession(session: Session): AuthorizationActor {
  const u = session.user;
  const roles = (u.roles ?? []) as UserRole[];
  const bridged =
    u.unionId && u.localId
      ? relationshipsFromRoleClaims({
          unionId: u.unionId,
          localId: u.localId,
          bargainingUnitId: u.bargainingUnitId,
          roles,
        })
      : { memberships: [] as EffectiveMembership[], assignments: [] as EffectiveAssignment[] };
  return {
    userId: u.id,
    unionId: u.unionId,
    divisionId: u.divisionId,
    activeLocalId: u.localId,
    bargainingUnitId: u.bargainingUnitId,
    roles,
    memberships: bridged.memberships,
    assignments: bridged.assignments,
    delegations: [],
    circleMemberships: [],
    mfaVerified: Boolean(u.mfaVerified),
    accountActive: true,
    source: "session",
  };
}

/**
 * Map Hub role claims on a user row to the local membership + office
 * relationships capability checks expect. Used for memory sessions and as a
 * Postgres bridge when seed-admin / pre-authorization accounts have roles but
 * no `local_memberships` / `officer_assignments` rows yet.
 */
export function relationshipsFromRoleClaims(input: {
  unionId: string;
  localId: string;
  bargainingUnitId?: string | null;
  roles: readonly UserRole[];
}): {
  memberships: EffectiveMembership[];
  assignments: EffectiveAssignment[];
} {
  const memberships: EffectiveMembership[] = [
    {
      unionId: input.unionId,
      localId: input.localId,
      bargainingUnitId: input.bargainingUnitId ?? undefined,
      isPrimary: true,
    },
  ];
  const assignments: EffectiveAssignment[] = [];
  const positions: Array<[UserRole, OfficerPosition]> = [
    ["local_president", "president"],
    ["local_steward", "steward"],
    ["local_exec", "executive_member"],
  ];
  for (const [role, position] of positions) {
    if (input.roles.includes(role)) {
      assignments.push({
        unionId: input.unionId,
        localId: input.localId,
        position,
      });
    }
  }
  return { memberships, assignments };
}

/**
 * Merge durable relationship rows with role-claim bridges for the user's
 * primary local. Never invents a local the user row does not carry.
 */
export function mergeRoleClaimBridge(input: {
  unionId?: string | null;
  localId?: string | null;
  bargainingUnitId?: string | null;
  roles: readonly UserRole[];
  memberships: EffectiveMembership[];
  assignments: EffectiveAssignment[];
}): {
  memberships: EffectiveMembership[];
  assignments: EffectiveAssignment[];
} {
  if (!input.unionId || !input.localId) {
    return { memberships: input.memberships, assignments: input.assignments };
  }
  const bridged = relationshipsFromRoleClaims({
    unionId: input.unionId,
    localId: input.localId,
    bargainingUnitId: input.bargainingUnitId,
    roles: input.roles,
  });
  const memberships = [...input.memberships];
  for (const row of bridged.memberships) {
    if (
      !memberships.some(
        (m) => m.unionId === row.unionId && m.localId === row.localId,
      )
    ) {
      memberships.push(row);
    }
  }
  const assignments = [...input.assignments];
  for (const row of bridged.assignments) {
    if (
      !assignments.some(
        (a) =>
          a.unionId === row.unionId &&
          a.localId === row.localId &&
          a.position === row.position,
      )
    ) {
      assignments.push(row);
    }
  }
  return { memberships, assignments };
}

function positionHas(position: OfficerPosition, capability: Capability): boolean {
  const leadership: Capability[] = [
    "memberships.manage", "officers.manage", "delegations.manage", "circles.create",
    "circles.admin", "grievances.summary.read", "grievances.case.read",
    "grievances.case.write", "grievances.access.manage", "grievances.member_updates.publish",
  ];
  if (position === "president" || position === "vice_president") return leadership.includes(capability);
  if (position === "grievance_officer") {
    return ["grievances.summary.read", "grievances.case.read", "grievances.case.write", "grievances.access.manage", "grievances.member_updates.publish"].includes(capability);
  }
  if (position === "steward") return ["grievances.summary.read", "grievances.case.write", "circles.admin"].includes(capability);
  if (position === "executive_member") return ["grievances.summary.read", "circles.create", "circles.admin"].includes(capability);
  return false;
}

function roleHas(roles: UserRole[], capability: Capability): boolean {
  if (roles.includes("platform_admin")) return ["tenant.configure", "memberships.manage", "officers.manage", "circles.create", "delegations.manage"].includes(capability);
  if (roles.includes("union_admin")) return ["tenant.configure", "memberships.manage", "officers.manage", "circles.create", "delegations.manage"].includes(capability);
  if (roles.includes("division_admin")) return ["tenant.configure", "memberships.manage", "officers.manage", "circles.create", "delegations.manage"].includes(capability);
  return false;
}

export function decideCapability(
  actor: AuthorizationActor,
  capability: Capability,
  scope: { unionId?: string; localId?: string },
): AuthorizationDecision {
  if (!actor.accountActive) return { allowed: false, capability, reason: "inactive_account" };
  const administrative = roleHas(actor.roles, capability);
  // platform_admin may act across unions for admin capabilities; other admins
  // stay home-union scoped. Do this before the hard union_mismatch reject so
  // operators without a home union (seed-admin platform_admin) still work.
  if (
    scope.unionId &&
    actor.unionId !== scope.unionId &&
    !(actor.roles.includes("platform_admin") && administrative)
  ) {
    return { allowed: false, capability, reason: "union_mismatch" };
  }
  const localScoped = Boolean(scope.localId);
  const matchingMembership = actor.memberships.find((m) =>
    m.unionId === scope.unionId && (!localScoped || m.localId === scope.localId),
  );
  const matchingAssignment = localScoped
    ? actor.assignments.find((a) => a.unionId === scope.unionId && a.localId === scope.localId)
    : undefined;
  if (administrative) {
    return { allowed: true, capability, reason: "administrative_role", relationship: actor.roles.find((r) => ["platform_admin", "union_admin", "division_admin"].includes(r)) };
  }
  if (localScoped && !matchingMembership) return { allowed: false, capability, reason: "active_local_membership_required" };
  if (matchingAssignment && positionHas(matchingAssignment.position, capability)) {
    return { allowed: true, capability, reason: "active_officer_assignment", relationship: matchingAssignment.position };
  }
  const delegation = localScoped
    ? actor.delegations.find((d) =>
        d.unionId === scope.unionId && d.localId === scope.localId &&
        d.capability === capability && new Date(d.endsAt).getTime() > Date.now(),
      )
    : undefined;
  if (delegation) return { allowed: true, capability, reason: "active_delegation", relationship: delegation.grantorUserId };
  return { allowed: false, capability, reason: "capability_not_granted" };
}

export function isCrossLocalAdministrator(actor: AuthorizationActor): boolean {
  return actor.roles.some((r) => ["platform_admin", "union_admin", "division_admin"].includes(r));
}
