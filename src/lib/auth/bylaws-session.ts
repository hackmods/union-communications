import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { getTenantContext } from "@/lib/tenant/loader";
import type { Session } from "next-auth";
import { canAccessBylawsModule, canWriteBylaws } from "@/lib/hub-governance/access";
import type { HubBylawDraft } from "@/types/hub-bylaws";
import type { UserRole } from "@/types/tenant";
import { localScopeFilter } from "@/lib/authorization/scope-filter";

export type BylawsSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

const CROSS_LOCAL_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
];

export async function requireBylawsSession(): Promise<BylawsSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = await enabledModulesForSession(session);
  if (!canAccessBylawsModule(roles, modules)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}

export function canWriteBylawsForSession(session: Session): boolean {
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = modulesForSession(session);
  return canWriteBylaws(roles, modules);
}

/** Tenant modules for the session's union (Postgres overlay hydrated). */
export async function enabledModulesForSession(
  session: Session,
): Promise<string[]> {
  if (!session.user.unionId) return [];
  await hydrateTenantOverlayFromPostgres();
  return modulesForSession(session);
}

function modulesForSession(session: Session): string[] {
  if (!session.user.unionId) return [];
  const tenant = getTenantContext(session.user.unionId, session.user.localId);
  return tenant?.union.enabledModules ?? [];
}

/** List scope: session union, plus local only when not an elevated cross-local. */
export function bylawsListScope(session: Session): {
  unionId: string;
  localId?: string;
} {
  const roles = (session.user.roles ?? []) as UserRole[];
  const crossLocal = roles.some((r) => CROSS_LOCAL_ROLES.includes(r));
  return {
    unionId: session.user.unionId ?? "__none__",
    localId: localScopeFilter(session.user.localId, crossLocal),
  };
}

/** True when the draft row belongs to the session's tenant scope. */
export function bylawsScopedForSession(
  session: Session,
  draft: HubBylawDraft,
): boolean {
  if (draft.unionId !== session.user.unionId) return false;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (roles.some((r) => CROSS_LOCAL_ROLES.includes(r))) return true;
  return Boolean(session.user.localId && draft.localId === session.user.localId);
}
