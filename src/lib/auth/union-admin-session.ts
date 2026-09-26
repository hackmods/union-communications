import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";

export type UnionAdminSessionResult =
  | { ok: true; userId: string; unionId: string }
  | { ok: false; status: 401 | 403; error: string };

/** Tenant-owned configuration access; never accepts a target union from input. */
export async function requireUnionAdminSession(): Promise<UnionAdminSessionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, status: 401, error: "Unauthorized" };
  if (!sessionMfaOk(session)) return { ok: false, status: 403, error: "MFA required" };
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive || !actor.unionId || actor.unionId !== session.user.unionId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!actor.roles.includes("union_admin")) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, userId: actor.userId, unionId: actor.unionId };
}
