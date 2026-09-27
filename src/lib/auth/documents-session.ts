import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { getTenantContext } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import type { AuthorizationActor } from "@/lib/authorization/model";
import type { Session } from "next-auth";

export type DocumentsSessionResult =
  | { ok: true; session: Session; actor: AuthorizationActor; unionId: string; localId: string; canReadShared: boolean }
  | { ok: false; status: number; error: string };

/** Private Documents are local records, not a privilege of union/platform rank. */
export async function requireDocumentsSession(options: { requireOfficer?: boolean } = {}): Promise<DocumentsSessionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, status: 401, error: "Unauthorized" };
  if (!sessionMfaOk(session)) return { ok: false, status: 403, error: "MFA required" };
  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId || !localId) return { ok: false, status: 403, error: "Active union and local required" };

  await hydrateTenantOverlayFromPostgres();
  if (!getTenantContext(unionId, localId)?.union.enabledModules.includes("documents")) {
    return { ok: false, status: 403, error: "Documents module disabled" };
  }
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive || actor.unionId !== unionId) {
    return { ok: false, status: 403, error: "Active local membership required" };
  }
  const member = actor.memberships.some((m) => m.unionId === unionId && m.localId === localId);
  const officer = actor.assignments.some((a) =>
    a.unionId === unionId && a.localId === localId &&
    ["president", "vice_president", "grievance_officer", "steward", "executive_member"].includes(a.position),
  );
  if (!member) return { ok: false, status: 403, error: "Active local membership required" };
  if (options.requireOfficer !== false && !officer) return { ok: false, status: 403, error: "Active local officer or steward required" };
  return { ok: true, session, actor, unionId, localId, canReadShared: officer };
}
