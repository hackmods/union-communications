import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import type { Session } from "next-auth";
import {
  canAccessBumpingModule,
  canEditBumpingCase,
  canViewBumpingCase,
} from "@/lib/bumping/access";
import { getTenantContext } from "@/lib/tenant/loader";
import type { BumpingCase } from "@/types/bumping";
import type { UserRole } from "@/types/tenant";

export type BumpingSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireBumpingSession(): Promise<BumpingSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessBumpingModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!isBumpingModuleEnabled(session)) {
    return { ok: false, status: 403, error: "Module not enabled" };
  }
  return { ok: true, session };
}

export function isBumpingModuleEnabled(session: Session): boolean {
  if (!session.user.unionId) return false;
  const tenant = getTenantContext(session.user.unionId);
  return tenant?.union.enabledModules.includes("bumping") ?? false;
}

export function assertBumpingView(
  session: Session,
  bumpingCase: BumpingCase,
): boolean {
  return canViewBumpingCase(
    bumpingCase,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertBumpingEdit(
  session: Session,
  bumpingCase: BumpingCase,
): boolean {
  return canEditBumpingCase(
    bumpingCase,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForBumpingSession(session: Session) {
  return {
    unionId: session.user.unionId ?? "__none__",
    localId: session.user.localId,
  };
}
