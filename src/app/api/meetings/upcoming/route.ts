import { NextResponse } from "next/server";
import { requireMeetingsSession } from "@/lib/auth/meetings-session";
import { computeNextMeeting, daysUntil } from "@/lib/meetings/recurrence";
import { meetingsStore } from "@/lib/meetings/store";

/** Lightweight endpoint backing the officer in-app "meeting coming up" banner. */
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
  if (!schedule) {
    return NextResponse.json({ nextMeeting: null, daysUntil: null });
  }
  const nextMeeting = computeNextMeeting(schedule);
  if (!nextMeeting) {
    return NextResponse.json({ nextMeeting: null, daysUntil: null });
  }
  return NextResponse.json({
    nextMeeting,
    daysUntil: daysUntil(nextMeeting.startsAt),
  });
}
