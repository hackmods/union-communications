import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireTimeSession, assertTimeView, tenantIdsForTimeSession } from "@/lib/auth/time-session";
import { savePunchPhoto } from "@/lib/time/punch-photo";
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
  const { entryId, notes, clockOutGps, punchPhoto } = body;

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

  let entry = await timeStore.clockOut(entryId, { notes, clockOutGps });
  if (!entry) {
    return NextResponse.json({ error: "Clock-out failed" }, { status: 400 });
  }

  if (punchPhoto && typeof punchPhoto === "object") {
    const { unionId, localId } = tenantIdsForTimeSession(session);
    const photo = {
      ...punchPhoto,
      kind: "clock_out" as const,
    };
    const photoResult = await savePunchPhoto({
      entryId: entry.id,
      photo,
      unionId,
      localId,
      uploadedById: session.user.id,
    });
    if (photoResult.error) {
      return NextResponse.json({ error: photoResult.error }, { status: 400 });
    }
    entry = (await timeStore.getEntryById(entry.id)) ?? entry;
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
