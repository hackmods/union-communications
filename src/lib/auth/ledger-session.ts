import { auth } from "@/auth";
import type { Session } from "next-auth";
import {
  canAccessLedgerModule,
  canCrossLocalLedger,
  canViewLedgerEntry,
} from "@/lib/ledger/access";
import type { LedgerEntry } from "@/types/ledger";
import type { UserRole } from "@/types/tenant";

export type LedgerSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireLedgerSession(): Promise<LedgerSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.mfaVerified) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessLedgerModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}

export function assertLedgerView(
  session: Session,
  entry: LedgerEntry,
): boolean {
  return canViewLedgerEntry(
    entry,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForLedgerSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined as string | undefined };
  }

  const crossLocal = canCrossLocalLedger(roles);
  return {
    unionId,
    localId: session.user.localId,
    ...(crossLocal && !session.user.localId ? { localId: undefined } : {}),
  };
}

export function tenantIdsForLedgerSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}
