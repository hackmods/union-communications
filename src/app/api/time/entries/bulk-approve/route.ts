import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTimeApprove,
  requireTimeSession,
} from "@/lib/auth/time-session";
import { timeStore } from "@/lib/time/store";

export async function POST(request: Request) {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const body = await request.json();
  const ids = Array.isArray(body?.ids)
    ? (body.ids as unknown[]).filter((id): id is string => typeof id === "string")
    : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "ids must be a non-empty string array" },
      { status: 400 },
    );
  }
  if (ids.length > 100) {
    return NextResponse.json(
      { error: "ids limited to 100 per request" },
      { status: 400 },
    );
  }

  const approved: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const id of ids) {
    const existing = await timeStore.getEntryById(id);
    if (!existing) {
      skipped.push({ id, reason: "not_found" });
      continue;
    }
    if (!assertTimeApprove(session, existing)) {
      skipped.push({ id, reason: "forbidden" });
      continue;
    }
    if (existing.status !== "submitted") {
      skipped.push({ id, reason: "not_submitted" });
      continue;
    }

    const entry = await timeStore.updateEntryStatus(id, "approved", {
      approvedById: session.user.id,
    });
    if (!entry) {
      skipped.push({ id, reason: "update_failed" });
      continue;
    }

    await auditLog.log({
      userId: session.user.id,
      action: "time.approve",
      resourceType: "time_entry",
      resourceId: id,
      unionId: session.user.unionId,
      localId: session.user.localId,
    });
    approved.push(id);
  }

  await auditLog.log({
    userId: session.user.id,
    action: "time.bulk_approve",
    resourceType: "time_entry",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({
    approvedCount: approved.length,
    approved,
    skipped,
  });
}
