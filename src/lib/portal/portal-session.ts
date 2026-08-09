import { auth } from "@/auth";
import type { Session } from "next-auth";
import { getTenantContext } from "@/lib/tenant/loader";
import { canAccessPortal } from "@/lib/portal/access";
import type { UserRole } from "@/types/tenant";

export type PortalSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requirePortalSession(): Promise<PortalSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.unionId) {
    return { ok: false, status: 403, error: "No union context" };
  }
  const tenant = getTenantContext(session.user.unionId);
  if (!tenant?.union.enabledModules.includes("portal")) {
    return { ok: false, status: 403, error: "Portal module disabled" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessPortal(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}
