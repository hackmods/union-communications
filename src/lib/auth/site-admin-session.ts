import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { localeMfaRedirect } from "@/lib/auth/mfa-return-path";
import { isPlatformOperator } from "@/lib/platform/operator-nav";
import type { UserRole } from "@/types/tenant";

export type SiteAdminSessionResult =
  | {
      ok: true;
      session: {
        user: { id: string; unionId?: string; localId?: string; roles: UserRole[] };
      };
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
      /** Distinguishes MFA step-up from role denial when status is 403. */
      code?: "unauthorized" | "mfa_required" | "forbidden";
    };

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
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      code: "unauthorized",
    };
  }
  if (!sessionMfaOk(session)) {
    return {
      ok: false,
      status: 403,
      error: "MFA required",
      code: "mfa_required",
    };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!isPlatformOperator(roles)) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      code: "forbidden",
    };
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

/**
 * Page-level redirect for a failed site-admin gate.
 * MFA failures go to the challenge with a return path (not a silent Hub bounce).
 */
export function redirectUnlessSiteAdmin(
  locale: string,
  gate: SiteAdminSessionResult,
  returnPath: string,
): asserts gate is Extract<SiteAdminSessionResult, { ok: true }> {
  if (gate.ok) return;
  if (gate.status === 401 || gate.code === "unauthorized") {
    redirect(`/${locale}/app/login`);
  }
  if (gate.code === "mfa_required" || gate.error === "MFA required") {
    redirect(localeMfaRedirect(locale, returnPath));
  }
  redirect(`/${locale}/app`);
}
