import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  listFiltersForTimeSession,
  requireTimeSession,
} from "@/lib/auth/time-session";
import { timeStore } from "@/lib/time/memory-adapter";

export async function GET() {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const filters = listFiltersForTimeSession(session);
  const items = await timeStore.listEntries(filters);
  const active = await timeStore.getActiveEntry(
    session.user.id,
    session.user.unionId ?? "__none__",
  );

  await auditLog.log({
    userId: session.user.id,
    action: "time.entries.list",
    resourceType: "time_entry",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ entries: items, activeEntry: active });
}
