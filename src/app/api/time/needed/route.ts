import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/memory-adapter";
import type { UserRole } from "@/types/tenant";

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 14);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function GET(request: Request) {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  const { unionId, localId } = tenantIdsForTimeSession(session);
  const url = new URL(request.url);
  const defaults = defaultRange();
  const from = url.searchParams.get("from") ?? defaults.from;
  const to = url.searchParams.get("to") ?? defaults.to;

  const isAdmin = canAdminTime(roles);
  const needed = await timeStore.listNeededEntries({
    unionId,
    localId,
    from,
    to,
    workerId: isAdmin ? undefined : session.user.id,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "time.needed.list",
    resourceType: "time_needed",
    resourceId: "*",
    unionId,
    localId,
  });

  return NextResponse.json({ needed, from, to });
}
