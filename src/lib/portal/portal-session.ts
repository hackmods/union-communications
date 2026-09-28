import { auth } from "@/auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { canAccessPortal } from "@/lib/portal/access";
import type { TenantContext, UserRole } from "@/types/tenant";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import type { AuthorizationActor } from "@/lib/authorization/model";
import { sessionHasMfaForActor } from "@/lib/auth/mfa-access";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { actorHasActiveCircleAdminAuthority } from "@/lib/portal/mfa-authority";
import { localeMfaRedirect } from "@/lib/auth/mfa-return-path";

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
  const hasCircleAdminAuthority = isHostedCustomerMode()
    ? await actorHasActiveCircleAdminAuthority(actor)
    : false;
  if (!sessionHasMfaForActor(session, actor, process.env, hasCircleAdminAuthority)) {
    return { ok: false, status: 403, error: "MFA verification required" };
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

export type PortalPageGate = {
  session: Session;
  roles: UserRole[];
  tenant: TenantContext;
  /** False when the union has Portal off — pages should render the teaser. */
  portalEnabled: boolean;
};

/**
 * Server pages/layouts under `/portal`.
 * When the Portal module is off, still authenticates and returns
 * `portalEnabled: false` so the layout can show a feature teaser (APIs stay 403).
 */
export async function requirePortalPage(locale: string): Promise<PortalPageGate> {
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!session.user.unionId) redirect(`/${locale}/app`);
  await hydrateTenantOverlayFromPostgres();
  const tenant = getTenantContext(session.user.unionId, session.user.localId);
  if (!tenant) redirect(`/${locale}/app`);
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) redirect(`/${locale}/app/login`);
  const hasCircleAdminAuthority = isHostedCustomerMode()
    ? await actorHasActiveCircleAdminAuthority(actor)
    : false;
  if (!sessionHasMfaForActor(session, actor, process.env, hasCircleAdminAuthority)) {
    redirect(localeMfaRedirect(locale, "/portal"));
  }
  const roles = actor.roles as UserRole[];
  const hasMembership = actor.memberships.some((membership) => membership.unionId === session.user.unionId);
  if (!hasMembership && !canAccessPortal(roles)) redirect(`/${locale}/app`);
  const portalEnabled = tenant.union.enabledModules.includes("portal");
  return { session, roles, tenant, portalEnabled };
}
