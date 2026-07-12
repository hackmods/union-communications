import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  assertTimeApprove,
  assertTimeView,
  requireTimeSession,
} from "@/lib/auth/time-session";
import { canSubmitTimeEntry } from "@/lib/time/access";
import { timeStore } from "@/lib/time/memory-adapter";
import type { TimeEntryStatus } from "@/types/time";
import type { UserRole } from "@/types/tenant";

const VALID_ACTIONS = ["submit", "approve", "reject"] as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id } = await context.params;
  const existing = await timeStore.getEntryById(id);
  if (!existing || !assertTimeView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { action } = body as { action?: (typeof VALID_ACTIONS)[number] };

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  let nextStatus: TimeEntryStatus;

  if (action === "submit") {
    if (
      !canSubmitTimeEntry(
        existing,
        session.user.id,
        session.user.unionId,
        session.user.localId,
        roles,
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    nextStatus = "submitted";
  } else {
    if (!assertTimeApprove(session, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.status !== "submitted") {
      return NextResponse.json(
        { error: "Entry must be submitted first" },
        { status: 400 },
      );
    }
    nextStatus = action === "approve" ? "approved" : "rejected";
  }

  const entry = await timeStore.updateEntryStatus(id, nextStatus, {
    approvedById:
      action === "approve" || action === "reject"
        ? session.user.id
        : undefined,
  });

  await auditLog.log({
    userId: session.user.id,
    action: `time.${action}`,
    resourceType: "time_entry",
    resourceId: id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ entry });
}
