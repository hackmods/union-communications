import { auth } from "@/auth";
import type { Session } from "next-auth";
import {
  canAccessMeetingsModule,
  canWriteMeetingSchedule,
} from "@/lib/meetings/access";
import type { UserRole } from "@/types/tenant";

export type MeetingsSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireMeetingsSession(): Promise<MeetingsSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.mfaVerified) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessMeetingsModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!session.user.unionId || !session.user.localId) {
    return { ok: false, status: 403, error: "No local context" };
  }
  return { ok: true, session };
}

export function assertMeetingsWrite(session: Session): boolean {
  return canWriteMeetingSchedule((session.user.roles ?? []) as UserRole[]);
}
