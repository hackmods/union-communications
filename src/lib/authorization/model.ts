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
  | "tenant.configure";

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
  const memberships: EffectiveMembership[] = [];
  if (u.unionId && u.localId) {
    memberships.push({
      unionId: u.unionId,
      localId: u.localId,
      bargainingUnitId: u.bargainingUnitId,
      isPrimary: true,
    });
  }
  // accessibleLocalIds remains a context-switch hint during migration. It is
  // deliberately not treated as an authorization relationship.
  const assignments: EffectiveAssignment[] = [];
  if (u.unionId && u.localId) {
    const positions: Array<[UserRole, OfficerPosition]> = [
      ["local_president", "president"],
      ["local_steward", "steward"],
      ["local_exec", "executive_member"],
    ];
    for (const [role, position] of positions) {
      if (roles.includes(role)) assignments.push({ unionId: u.unionId, localId: u.localId, position });
    }
  }
  return {
    userId: u.id,
    unionId: u.unionId,
    divisionId: u.divisionId,
    activeLocalId: u.localId,
    bargainingUnitId: u.bargainingUnitId,
    roles,
    memberships,
    assignments,
    delegations: [],
    circleMemberships: [],
    mfaVerified: Boolean(u.mfaVerified),
    accountActive: true,
    source: "session",
  };
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
  if (roles.includes("platform_admin")) return ["tenant.configure", "memberships.manage", "officers.manage", "circles.create"].includes(capability);
  if (roles.includes("union_admin")) return ["tenant.configure", "memberships.manage", "officers.manage", "circles.create"].includes(capability);
  if (roles.includes("division_admin")) return ["tenant.configure", "memberships.manage", "officers.manage", "circles.create"].includes(capability);
  return false;
}

export function decideCapability(
  actor: AuthorizationActor,
  capability: Capability,
  scope: { unionId?: string; localId?: string },
): AuthorizationDecision {
  if (!actor.accountActive) return { allowed: false, capability, reason: "inactive_account" };
  if (scope.unionId && actor.unionId !== scope.unionId) return { allowed: false, capability, reason: "union_mismatch" };
  const localScoped = Boolean(scope.localId);
  const matchingMembership = actor.memberships.find((m) =>
    m.unionId === scope.unionId && (!localScoped || m.localId === scope.localId),
  );
  const matchingAssignment = localScoped
    ? actor.assignments.find((a) => a.unionId === scope.unionId && a.localId === scope.localId)
    : undefined;
  if (roleHas(actor.roles, capability)) {
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
