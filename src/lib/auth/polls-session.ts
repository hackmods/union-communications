import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import type { Session } from "next-auth";
import {
  canAccessPollsModule,
  canViewPoll,
} from "@/lib/polls/access";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import type { PollDefinition } from "@/types/polls";
import type { UserRole } from "@/types/tenant";

export type PollsSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requirePollsSession(): Promise<PollsSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessPollsModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}

export function assertPollView(
  session: Session,
  poll: PollDefinition,
): boolean {
  return canViewPoll(
    poll,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForPollsSession(session: Session) {
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

export function tenantIdsForPollsSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}
