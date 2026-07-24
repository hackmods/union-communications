import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import type { Session } from "next-auth";
import {
  canAccessMeetingsModule,
  canViewUnionMeeting,
  canWriteMeetingEvents,
  canWriteMeetingSchedule,
} from "@/lib/meetings/access";
import type { UnionMeeting } from "@/types/meetings";
import type { UserRole } from "@/types/tenant";

export type MeetingsSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireMeetingsSession(): Promise<MeetingsSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
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

export function assertMeetingEventsWrite(session: Session): boolean {
  return canWriteMeetingEvents((session.user.roles ?? []) as UserRole[]);
}

export function assertUnionMeetingView(
  session: Session,
  meeting: UnionMeeting,
): boolean {
  return canViewUnionMeeting(
    meeting,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}
