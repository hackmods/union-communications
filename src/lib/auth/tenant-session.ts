import { auth } from "@/auth";
import type { Session } from "next-auth";
import {
  canCreateUnionTenant,
  canManageTenantOnboarding,
} from "@/lib/tenant/access";
import type { UserRole } from "@/types/tenant";

export type TenantSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireTenantOnboardingSession(): Promise<TenantSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.mfaVerified) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canManageTenantOnboarding(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}

export function sessionCanCreateUnion(session: Session): boolean {
  return canCreateUnionTenant((session.user.roles ?? []) as string[]);
}
