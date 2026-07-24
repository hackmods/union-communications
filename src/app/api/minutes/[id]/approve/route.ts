import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertMinutesView,
  requireMinutesSession,
} from "@/lib/auth/minutes-session";
import { canApproveMinutes } from "@/lib/minutes/access";
import { minutesStore } from "@/lib/minutes/store";
import type { UserRole } from "@/types/tenant";

export async function POST(
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
  if (!canApproveMinutes(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await minutesStore.getById(id);
  if (!existing || !assertMinutesView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === "approved") {
    return NextResponse.json(
      { error: "Already approved" },
      { status: 409 },
    );
  }

  const entry = await minutesStore.approve(id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "minutes.approve",
    resourceType: "meeting_minutes",
    resourceId: entry.id,
    unionId: entry.unionId,
    localId: entry.localId,
  });

  return NextResponse.json({ minutes: entry });
}
