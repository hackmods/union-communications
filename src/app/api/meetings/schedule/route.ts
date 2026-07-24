import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertMeetingsWrite,
  requireMeetingsSession,
} from "@/lib/auth/meetings-session";
import { computeNextMeeting } from "@/lib/meetings/recurrence";
import { meetingsStore } from "@/lib/meetings/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { upsertMeetingScheduleSchema } from "@/lib/validation/meetings";

export async function GET() {
  const authResult = await requireMeetingsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { unionId, localId } = authResult.session.user;
  const schedule = await meetingsStore.getForLocal(unionId!, localId!);
  const nextMeeting = schedule ? computeNextMeeting(schedule) : null;
  return NextResponse.json({ schedule, nextMeeting });
}

export async function PUT(request: Request) {
  const authResult = await requireMeetingsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  if (!assertMeetingsWrite(authResult.session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseJsonBody(upsertMeetingScheduleSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const { unionId, localId, id: userId } = authResult.session.user;
  const schedule = await meetingsStore.upsertForLocal(
    unionId!,
    localId!,
    parsed.data,
    { updatedById: userId },
  );

  await auditLog.log({
    userId,
    action: "meetings.schedule.update",
    resourceType: "local_meeting_schedule",
    resourceId: schedule.id,
    unionId: unionId!,
    localId: localId!,
  });

  const nextMeeting = computeNextMeeting(schedule);
  return NextResponse.json({ schedule, nextMeeting });
}
