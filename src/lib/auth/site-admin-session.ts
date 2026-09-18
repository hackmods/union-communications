import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { isPlatformOperator } from "@/lib/platform/operator-nav";
import type { UserRole } from "@/types/tenant";

export type SiteAdminSessionResult =
  | {
      ok: true;
      session: {
        user: { id: string; unionId?: string; localId?: string; roles: UserRole[] };
      };
    }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Strict platform-admin gate for `/app/site-admin/*` and `/api/site-admin/*`.
 *
 * Cross-tenant reads and writes through this surface ARE audited under the
 * `site_admin.*` action namespace — see `docs/RBAC.md` "platform_admin
 * cross-tenant break-glass" section. There is no `union_admin` /
 * `local_president` fallback by design: `requireSiteAdminSession` returns
 * 403 for every non-platform-admin role, even if the role can read the
 * same data through a different (tenant-scoped) surface.
 */
export async function requireSiteAdminSession(): Promise<SiteAdminSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!isPlatformOperator(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return {
    ok: true,
    session: {
      user: {
        id: session.user.id,
        unionId: session.user.unionId,
        localId: session.user.localId,
        roles,
      },
    },
  };
}
