import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { getTenantContext } from "@/lib/tenant/loader";
import type { Session } from "next-auth";
import {
  canAccessProposalsModule,
  canPublishProposals,
  canWriteProposals,
} from "@/lib/hub-governance/access";
import type { HubProposalPackage } from "@/types/hub-proposals";
import type { UserRole } from "@/types/tenant";
import { enabledModulesForSession } from "@/lib/auth/bylaws-session";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { proposalsStore } from "@/lib/hub-governance/store";

export type ProposalsSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

const CROSS_LOCAL_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
];

export async function requireProposalsSession(): Promise<ProposalsSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = await enabledModulesForSession(session);
  if (!canAccessProposalsModule(roles, modules)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}

export function canWriteProposalsForSession(session: Session): boolean {
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = modulesForSession(session);
  return canWriteProposals(roles, modules);
}

export function canPublishProposalsForSession(session: Session): boolean {
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = modulesForSession(session);
  return canPublishProposals(roles, modules);
}

function modulesForSession(session: Session): string[] {
  if (!session.user.unionId) return [];
  const tenant = getTenantContext(session.user.unionId, session.user.localId);
  return tenant?.union.enabledModules ?? [];
}

/** List scope: session union, plus local only when not an elevated cross-local. */
export function proposalsListScope(session: Session): {
  unionId: string;
  localId?: string;
} {
  const roles = (session.user.roles ?? []) as UserRole[];
  const crossLocal = roles.some((r) => CROSS_LOCAL_ROLES.includes(r));
  return {
    unionId: session.user.unionId ?? "__none__",
    ...(!crossLocal && session.user.localId
      ? { localId: session.user.localId }
      : {}),
  };
}

/** True when the package belongs to the session's tenant scope. */
export function proposalScopedForSession(
  session: Session,
  pkg: HubProposalPackage,
): boolean {
  if (pkg.unionId !== session.user.unionId) return false;
  if (!session.user.localId) return true;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (roles.some((r) => CROSS_LOCAL_ROLES.includes(r))) return true;
  return pkg.localId === session.user.localId;
}

/**
 * Load a package inside the session's tenant scope. Returns the package when
 * found and in scope, otherwise null (callers answer 403/404 uniformly).
 */
export async function loadProposalPackageScoped(
  id: string,
  session: Session,
): Promise<HubProposalPackage | null> {
  const rlsCtx = rlsContextForSession(session) ?? {};
  const pkg = await withRlsContext(rlsCtx, () =>
    proposalsStore.getPackage(id),
  );
  if (!pkg) return null;
  if (!proposalScopedForSession(session, pkg)) return null;
  return pkg;
}