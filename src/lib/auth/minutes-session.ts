import { auth } from "@/auth";
import type { Session } from "next-auth";
import {
  canAccessMinutesModule,
  canViewMinutes,
} from "@/lib/minutes/access";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import type { MeetingMinutes } from "@/types/minutes";
import type { UserRole } from "@/types/tenant";

export type MinutesSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireMinutesSession(): Promise<MinutesSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.mfaVerified) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessMinutesModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}

export function assertMinutesView(
  session: Session,
  minutes: MeetingMinutes,
): boolean {
  return canViewMinutes(
    minutes,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForMinutesSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined };
  }

  if (roles.includes("solo_account")) {
    return { unionId };
  }

  const crossLocal = canCrossLocalGrievance(roles);
  return {
    unionId,
    localId: session.user.localId,
    ...(crossLocal && !session.user.localId ? { localId: undefined } : {}),
  };
}

export function tenantIdsForMinutesSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}
