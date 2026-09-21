import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { isMfaEnabled } from "@/lib/auth/mfa-policy";
import { grievanceDbBackend } from "@/lib/db/backend";
import type { Session } from "next-auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { actorFromSession, type AuthorizationActor } from "@/lib/authorization/model";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { getTenantContext } from "@/lib/tenant/loader";
import { authorizeGrievance } from "@/lib/grievance/authorization";
import {
  canAccessGrievanceModule,
} from "@/lib/grievance/access";
import type { Grievance } from "@/types/grievance";

export type GrievanceSessionResult =
  | { ok: true; session: Session; actor: AuthorizationActor }
  | { ok: false; status: number; error: string };

export async function requireGrievanceSession(): Promise<GrievanceSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const durableProductionCasework = process.env.NODE_ENV === "production" && grievanceDbBackend() === "postgres";
  if (durableProductionCasework && !isMfaEnabled()) {
    return { ok: false, status: 503, error: "MFA must be enabled before durable grievance casework is available" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) {
    return { ok: false, status: 401, error: "Session expired" };
  }
  const roles = actor.roles;
  const hasAuthorizedRelationship = actor.assignments.some((assignment) => assignment.unionId === actor.unionId)
    || actor.delegations.some((delegation) => delegation.unionId === actor.unionId && delegation.capability.startsWith("grievances."));
  if (!canAccessGrievanceModule(roles) && !hasAuthorizedRelationship) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (session.user.unionId) {
    await hydrateTenantOverlayFromPostgres();
    const tenant = getTenantContext(session.user.unionId, session.user.localId);
    if (!tenant?.union.enabledModules.includes("grievance")) {
      return { ok: false, status: 403, error: "Grievance module disabled" };
    }
  }
  return { ok: true, session, actor };
}

export async function assertGrievanceView(
  actorOrSession: AuthorizationActor | Session,
  grievance: Grievance,
): Promise<boolean> {
  const actor = "userId" in actorOrSession ? actorOrSession : await resolveAuthorizationActor(actorOrSession);
  const decision = await authorizeGrievance(actor, grievance);
  return decision.allowed && (decision.level === "case_read" || decision.level === "case_write");
}

export async function assertGrievanceEdit(
  actorOrSession: AuthorizationActor | Session,
  grievance: Grievance,
): Promise<boolean> {
  const actor = "userId" in actorOrSession ? actorOrSession : await resolveAuthorizationActor(actorOrSession);
  const decision = await authorizeGrievance(actor, grievance);
  return decision.allowed && decision.level === "case_write";
}

export function listFiltersForSession(session: Session, actor: AuthorizationActor = actorFromSession(session)) {
  const unionId = session.user.unionId;
  if (!unionId) {
    return {
      unionId: "__none__",
      localId: undefined,
      bargainingUnitId: undefined,
      assignedStewardId: session.user.id,
    };
  }

  if (actor.roles.includes("solo_account")) {
    return {
      unionId,
      assignedStewardId: session.user.id,
    };
  }

  if (actor.roles.some((r) => ["union_admin", "division_admin", "platform_admin"].includes(r))) {
    return { unionId, localId: "__no_case_list__" };
  }
  if (!session.user.localId) {
    return { unionId, localId: "__no_local_context__", assignedStewardId: session.user.id };
  }

  const hasLocalWideCaseAccess = actor.assignments.some((assignment) =>
    assignment.unionId === unionId &&
    assignment.localId === session.user.localId &&
    ["president", "vice_president", "grievance_officer", "executive_member"].includes(assignment.position),
  );
  const hasLocalDelegatedCaseAccess = actor.delegations.some((delegation) =>
    delegation.unionId === unionId &&
    delegation.localId === session.user.localId &&
    ["grievances.case.read", "grievances.case.write"].includes(delegation.capability),
  );
  if (!hasLocalWideCaseAccess && !hasLocalDelegatedCaseAccess) {
    return {
      unionId,
      localId: session.user.localId,
      bargainingUnitId: session.user.bargainingUnitId,
      assignedStewardId: session.user.id,
      participantUserId: session.user.id,
    };
  }
  return {
    unionId,
    localId: session.user.localId,
    bargainingUnitId: session.user.bargainingUnitId,
  };
}
