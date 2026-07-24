import { auth } from "@/auth";
import type { Session } from "next-auth";
import {
  canAccessTravelModule,
  canViewTravelAuth,
} from "@/lib/travel/access";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import type { TravelAuthorization } from "@/types/travel";
import type { UserRole } from "@/types/tenant";

export type TravelSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireTravelSession(): Promise<TravelSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.mfaVerified) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessTravelModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}

export function assertTravelView(
  session: Session,
  authRow: TravelAuthorization,
): boolean {
  return canViewTravelAuth(
    authRow,
    session.user.unionId,
    session.user.localId,
    session.user.id,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForTravelSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined as string | undefined };
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

export function tenantIdsForTravelSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}
