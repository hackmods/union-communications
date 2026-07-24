import { NextResponse } from "next/server";
import { requireMeetingsSession } from "@/lib/auth/meetings-session";
import { computeNextMeeting, daysUntil } from "@/lib/meetings/recurrence";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";
import { meetingsStore } from "@/lib/meetings/store";
import type { MeetingRsvpTallies, UnionMeeting } from "@/types/meetings";

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
  const nextMeeting = schedule ? computeNextMeeting(schedule) : null;
  const scheduleDays =
    nextMeeting != null ? daysUntil(nextMeeting.startsAt) : null;

  const events = await meetingsRsvpStore.listMeetings({
    unionId: unionId!,
    localId: localId!,
  });
  const now = Date.now();
  const upcomingEvent: UnionMeeting | null =
    events
      .filter((e) => new Date(e.startsAt).getTime() >= now - 60 * 60 * 1000)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null;

  let eventTallies: MeetingRsvpTallies | null = null;
  let eventDaysUntil: number | null = null;
  if (upcomingEvent) {
    eventDaysUntil = daysUntil(upcomingEvent.startsAt);
    eventTallies = await meetingsRsvpStore.tallies(upcomingEvent.id);
    if (eventTallies && eventTallies.responseCount === 0) {
      eventTallies = null;
    }
  }

  return NextResponse.json({
    nextMeeting,
    daysUntil: scheduleDays,
    event: upcomingEvent
      ? {
          id: upcomingEvent.id,
          title: upcomingEvent.title,
          startsAt: upcomingEvent.startsAt,
          quorumNeeded: upcomingEvent.quorumNeeded,
        }
      : null,
    eventDaysUntil,
    eventTallies,
  });
}
