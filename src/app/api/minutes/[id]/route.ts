import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertMinutesView,
  requireMinutesSession,
} from "@/lib/auth/minutes-session";
import {
  canDeleteMinutes,
  canWriteMinutes,
} from "@/lib/minutes/access";
import { minutesStore } from "@/lib/minutes/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateMeetingMinutesSchema } from "@/lib/validation/minutes";
import type { UserRole } from "@/types/tenant";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireMinutesSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const entry = await minutesStore.getById(id);
  if (!entry || !assertMinutesView(authResult.session, entry)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "minutes.view",
    resourceType: "meeting_minutes",
    resourceId: entry.id,
    unionId: entry.unionId,
    localId: entry.localId,
  });

  return NextResponse.json({ minutes: entry });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const existing = await minutesStore.getById(id);
  if (!existing || !assertMinutesView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === "approved") {
    return NextResponse.json(
      { error: "Approved minutes cannot be edited" },
      { status: 409 },
    );
  }

  const raw = await request.json();
  const parsed = parseJsonBody(updateMeetingMinutesSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const entry = await minutesStore.update(id, parsed.data);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "minutes.update",
    resourceType: "meeting_minutes",
    resourceId: entry.id,
    unionId: entry.unionId,
    localId: entry.localId,
  });

  return NextResponse.json({ minutes: entry });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireMinutesSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  const { id } = await context.params;
  const existing = await minutesStore.getById(id);
  if (!existing || !assertMinutesView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canDeleteMinutes(existing, session.user.id, roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await minutesStore.remove(id);

  await auditLog.log({
    userId: session.user.id,
    action: "minutes.delete",
    resourceType: "meeting_minutes",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
