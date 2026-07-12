import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import { requireTimeSession } from "@/lib/auth/time-session";
import { assertTimeView } from "@/lib/auth/time-session";
import { timeStore } from "@/lib/time/memory-adapter";

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
  const { entryId, notes, clockOutGps } = body;

  if (!entryId) {
    return NextResponse.json({ error: "entryId is required" }, { status: 400 });
  }

  const existing = await timeStore.getEntryById(entryId);
  if (!existing || !assertTimeView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.workerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entry = await timeStore.clockOut(entryId, { notes, clockOutGps });
  if (!entry) {
    return NextResponse.json({ error: "Clock-out failed" }, { status: 400 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "time.clock_out",
    resourceType: "time_entry",
    resourceId: entry.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ entry });
}
