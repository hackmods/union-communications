import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import type { Session } from "next-auth";
import {
  canAccessOfficerRoster,
  canViewOfficerRosterEntry,
} from "@/lib/officers/access";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import type { OfficerRosterEntry } from "@/types/officer-roster";
import type { UserRole } from "@/types/tenant";

export type OfficerRosterSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireOfficerRosterSession(): Promise<OfficerRosterSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessOfficerRoster(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}

export function assertOfficerRosterView(
  session: Session,
  entry: OfficerRosterEntry,
): boolean {
  return canViewOfficerRosterEntry(
    entry,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForOfficerRosterSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined as string | undefined };
  }

  const crossLocal = canCrossLocalGrievance(roles);
  return {
    unionId,
    localId: session.user.localId,
    ...(crossLocal && !session.user.localId ? { localId: undefined } : {}),
  };
}

export function tenantIdsForOfficerRosterSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}
