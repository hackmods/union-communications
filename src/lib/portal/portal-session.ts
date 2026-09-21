import { auth } from "@/auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { canAccessPortal } from "@/lib/portal/access";
import type { TenantContext, UserRole } from "@/types/tenant";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import type { AuthorizationActor } from "@/lib/authorization/model";

export type PortalSessionResult =
  | { ok: true; session: Session; actor: AuthorizationActor }
  | { ok: false; status: number; error: string };

export async function requirePortalSession(): Promise<PortalSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.unionId) {
    return { ok: false, status: 403, error: "No union context" };
  }
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) {
    return { ok: false, status: 401, error: "Session expired" };
  }
  await hydrateTenantOverlayFromPostgres();
  const tenant = getTenantContext(session.user.unionId, session.user.localId);
  if (!tenant?.union.enabledModules.includes("portal")) {
    return { ok: false, status: 403, error: "Portal module disabled" };
  }
  const roles = actor.roles as UserRole[];
  const hasMembership = actor.memberships.some((membership) => membership.unionId === session.user.unionId);
  if (!hasMembership && !canAccessPortal(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session, actor };
}

/** Server pages/layouts under `/portal` — same redirects as the previous per-page gates. */
export async function requirePortalPage(locale: string): Promise<{
  session: Session;
  roles: UserRole[];
  tenant: TenantContext;
}> {
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!session.user.unionId) redirect(`/${locale}/app`);
  await hydrateTenantOverlayFromPostgres();
  const tenant = getTenantContext(session.user.unionId, session.user.localId);
  if (!tenant || !tenant.union.enabledModules.includes("portal")) {
    redirect(`/${locale}/app`);
  }
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) redirect(`/${locale}/app/login`);
  const roles = actor.roles as UserRole[];
  const hasMembership = actor.memberships.some((membership) => membership.unionId === session.user.unionId);
  if (!hasMembership && !canAccessPortal(roles)) redirect(`/${locale}/app`);
  return { session, roles, tenant };
}
