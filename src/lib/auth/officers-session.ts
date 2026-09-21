import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import type { Session } from "next-auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability, isCrossLocalAdministrator, type AuthorizationActor } from "@/lib/authorization/model";
import { localScopeFilter } from "@/lib/authorization/scope-filter";
import type { OfficerRosterEntry } from "@/types/officer-roster";

export type OfficerRosterSessionResult =
  | { ok: true; session: Session; actor: AuthorizationActor }
  | { ok: false; status: number; error: string };

export async function requireOfficerRosterSession(): Promise<OfficerRosterSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return { ok: false, status: 401, error: "Session expired" };
  const capability = decideCapability(actor, "officers.manage", {
    unionId: session.user.unionId,
    localId: session.user.localId,
  });
  if (!capability.allowed) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session, actor };
}

export function assertOfficerRosterView(
  actor: AuthorizationActor,
  entry: OfficerRosterEntry,
): boolean {
  return decideCapability(actor, "officers.manage", { unionId: entry.unionId, localId: entry.localId }).allowed;
}

export function listFiltersForOfficerRosterSession(session: Session, actor: AuthorizationActor) {
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined as string | undefined };
  }

  const crossLocal = isCrossLocalAdministrator(actor);
  return {
    unionId,
    localId: localScopeFilter(session.user.localId, crossLocal),
  };
}

export function tenantIdsForOfficerRosterSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}
