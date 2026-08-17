import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { canReadSiteFeedbackInbox } from "@/lib/platform-feedback/access";
import type { UserRole } from "@/types/tenant";

export type PlatformFeedbackInboxSessionResult =
  | { ok: true; session: { user: { id: string; roles: UserRole[] } } }
  | { ok: false; status: 401 | 403; error: string };

export async function requireSiteFeedbackInboxSession(): Promise<PlatformFeedbackInboxSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canReadSiteFeedbackInbox(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return {
    ok: true,
    session: { user: { id: session.user.id, roles } },
  };
}
