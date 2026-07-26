import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertCheckinScheduleView,
  requireCheckinsSession,
  tenantIdsForCheckinsSession,
} from "@/lib/auth/checkins-session";
import { canAnswerCheckin } from "@/lib/checkins/access";
import { currentPeriodForSchedule } from "@/lib/checkins/periods";
import { checkinsStore } from "@/lib/checkins/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createCheckinAnswerSchema } from "@/lib/validation/checkins";
import type { UserRole } from "@/types/tenant";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCheckinsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id } = await context.params;
  const schedule = await checkinsStore.getSchedule(id);
  if (!schedule || !assertCheckinScheduleView(session, schedule)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const periodParam = url.searchParams.get("period");
  const current = currentPeriodForSchedule(schedule);
  const periodKey = periodParam ?? current?.periodKey;
  if (!periodKey) {
    return NextResponse.json({
      answers: [],
      period: null,
      myAnswer: null,
    });
  }

  const answers = await checkinsStore.listAnswers(id, periodKey);
  const myAnswer = await checkinsStore.getAnswer(
    id,
    periodKey,
    session.user.id,
  );

  await auditLog.log({
    userId: session.user.id,
    action: "checkins.answers.list",
    resourceType: "checkin_schedule",
    resourceId: id,
    unionId: schedule.unionId,
    localId: schedule.localId,
  });

  return NextResponse.json({
    answers,
    period: current ?? { periodKey, periodLabel: periodKey },
    myAnswer,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCheckinsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id } = await context.params;
  const schedule = await checkinsStore.getSchedule(id);
  if (!schedule || !assertCheckinScheduleView(session, schedule)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  if (
    !canAnswerCheckin(
      schedule,
      session.user.id,
      session.user.unionId,
      session.user.localId,
      roles,
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!schedule.active) {
    return NextResponse.json(
      { error: "Check-in is inactive" },
      { status: 400 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(createCheckinAnswerSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const current = currentPeriodForSchedule(schedule);
  if (!current) {
    return NextResponse.json(
      { error: "No active period for this schedule right now" },
      { status: 400 },
    );
  }

  const periodKey = parsed.data.periodKey ?? current.periodKey;
  if (periodKey !== current.periodKey) {
    return NextResponse.json(
      { error: "Answers are only accepted for the current period" },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForCheckinsSession(session);
  const answer = await checkinsStore.createAnswer(
    id,
    { body: parsed.data.body, periodKey },
    {
      unionId,
      localId,
      authorId: session.user.id,
      authorName: session.user.name ?? session.user.email ?? "Officer",
    },
  );

  if (!answer) {
    return NextResponse.json(
      { error: "Already answered this period" },
      { status: 409 },
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "checkins.answer",
    resourceType: "checkin_answer",
    resourceId: answer.id,
    unionId,
    localId,
  });

  return NextResponse.json({ answer }, { status: 201 });
}
