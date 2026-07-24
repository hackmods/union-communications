import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForMinutesSession,
  requireMinutesSession,
  tenantIdsForMinutesSession,
} from "@/lib/auth/minutes-session";
import { canWriteMinutes } from "@/lib/minutes/access";
import { minutesStore } from "@/lib/minutes/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createMeetingMinutesSchema } from "@/lib/validation/minutes";
import type { MinutesStatus, MeetingType } from "@/types/minutes";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requireMinutesSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const typeParam = url.searchParams.get("type");
  const filters = listFiltersForMinutesSession(session);

  const status =
    statusParam === "draft" || statusParam === "approved"
      ? (statusParam as MinutesStatus)
      : undefined;
  const meetingType =
    typeParam === "exec" ||
    typeParam === "general" ||
    typeParam === "committee"
      ? (typeParam as MeetingType)
      : undefined;

  const entries = await minutesStore.list({
    ...filters,
    status,
    meetingType,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "minutes.list",
    resourceType: "meeting_minutes",
    resourceId: "*",
    unionId: filters.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ minutes: entries });
}

export async function POST(request: Request) {
  const authResult = await requireMinutesSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canWriteMinutes(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createMeetingMinutesSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const tenant = tenantIdsForMinutesSession(session);
  const entry = await minutesStore.create(parsed.data, {
    unionId: tenant.unionId,
    localId: tenant.localId,
    recordedById: session.user.id,
    recordedByName: session.user.name ?? session.user.email ?? "Officer",
  });

  await auditLog.log({
    userId: session.user.id,
    action: "minutes.create",
    resourceType: "meeting_minutes",
    resourceId: entry.id,
    unionId: entry.unionId,
    localId: entry.localId,
  });

  return NextResponse.json({ minutes: entry }, { status: 201 });
}
