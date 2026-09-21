import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { dataDbBackend } from "@/lib/db/backend";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { getTenantContext } from "@/lib/tenant/loader";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";

const READ_ROLES: UserRole[] = ["platform_admin", "union_admin", "division_admin", "local_president"];
const WRITE_ROLES: UserRole[] = ["platform_admin", "union_admin", "division_admin", "local_president"];

export type DataAccessResult =
  | { ok: true; session: Session; unionId: string; localId: string; canWrite: boolean }
  | { ok: false; status: 401 | 403 | 404 | 503; error: string };

export async function requireDataAccess(write = false): Promise<DataAccessResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, status: 401, error: "Unauthorized" };
  if (!sessionMfaOk(session)) return { ok: false, status: 403, error: "MFA required" };
  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId || !localId) return { ok: false, status: 403, error: "Select a local to use UnionOps Data." };
  await hydrateTenantOverlayFromPostgres();
  const tenant = getTenantContext(unionId, localId);
  if (!tenant?.union.enabledModules.includes("data")) return { ok: false, status: 404, error: "UnionOps Data is not enabled for this union." };
  const roles = (session.user.roles ?? []) as UserRole[];
  const canWrite = roles.some((role) => WRITE_ROLES.includes(role));
  if (!roles.some((role) => READ_ROLES.includes(role)) || (write && !canWrite)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (dataDbBackend() !== "postgres") {
    return { ok: false, status: 503, error: "UnionOps Data requires durable PostgreSQL storage. Ask your instance operator to enable DATA_DB_BACKEND=postgres." };
  }
  return { ok: true, session, unionId, localId, canWrite };
}
