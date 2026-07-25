import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canClockTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import type { UserRole } from "@/types/tenant";

/**
 * Worker self-serve GPS consent for optional punch tags (8e).
 * POST /api/time/workers/consent-gps  { consent: true|false }
 */
export async function POST(request: Request) {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canClockTime(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { consent?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const roster = await timeStore.listWorkers(unionId, localId);
  const existing =
    roster.find((w) => w.userId === session.user.id) ??
    roster.find((w) => w.id === session.user.id);

  const displayName =
    existing?.displayName ??
    session.user.name ??
    session.user.email ??
    "Worker";

  const worker = await timeStore.upsertWorker(
    {
      id: existing?.id,
      displayName,
      userId: session.user.id,
      trackGaps: existing?.trackGaps ?? true,
      active: existing?.active ?? true,
      gpsConsentAt: body.consent
        ? new Date().toISOString()
        : null,
    },
    { unionId, localId },
  );

  await auditLog.log({
    userId: session.user.id,
    action: body.consent ? "time.gps.consent" : "time.gps.consent_revoke",
    resourceType: "time_worker",
    resourceId: worker.id,
    unionId,
    localId,
  });

  return NextResponse.json({ worker });
}
