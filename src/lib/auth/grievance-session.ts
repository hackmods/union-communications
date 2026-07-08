import { auth } from "@/auth";
import type { Session } from "next-auth";
import {
  canAccessGrievanceModule,
  canEditGrievance,
  canViewGrievance,
} from "@/lib/grievance/access";
import type { Grievance } from "@/types/grievance";
import type { UserRole } from "@/types/tenant";

export type GrievanceSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireGrievanceSession(): Promise<GrievanceSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.mfaVerified) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessGrievanceModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}

export function assertGrievanceView(
  session: Session,
  grievance: Grievance,
): boolean {
  return canViewGrievance(
    grievance,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertGrievanceEdit(
  session: Session,
  grievance: Grievance,
): boolean {
  return canEditGrievance(
    grievance,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined, assignedStewardId: session.user.id };
  }

  const elevated = roles.some((r) =>
    ["local_president", "local_exec", "union_admin", "division_admin", "platform_admin"].includes(r),
  );

  if (roles.includes("solo_account")) {
    return {
      unionId,
      assignedStewardId: session.user.id,
    };
  }

  if (!elevated && roles.includes("local_steward")) {
    return {
      unionId,
      localId: session.user.localId,
      assignedStewardId: session.user.id,
    };
  }

  return {
    unionId,
    localId: session.user.localId,
  };
}
