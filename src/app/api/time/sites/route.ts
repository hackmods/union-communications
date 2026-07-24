import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/store";
import type { UserRole } from "@/types/tenant";
import type { GeofenceMode } from "@/types/time";

const GEOFENCE_MODES: GeofenceMode[] = ["off", "warn", "block"];

export async function GET() {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { unionId, localId } = tenantIdsForTimeSession(session);
  const sites = await timeStore.listSites(unionId, localId);

  await auditLog.log({
    userId: session.user.id,
    action: "time.sites.list",
    resourceType: "work_site",
    resourceId: "*",
    unionId,
    localId,
  });

  return NextResponse.json({ sites });
}

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
  if (!canAdminTime(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name,
    lat,
    lng,
    geofenceRadiusM,
    geofenceMode,
    active,
    id,
  } = body as {
    name?: string;
    lat?: number;
    lng?: number;
    geofenceRadiusM?: number;
    geofenceMode?: GeofenceMode;
    active?: boolean;
    id?: string;
  };

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "lat and lng are required numbers" },
      { status: 400 },
    );
  }
  if (typeof geofenceRadiusM !== "number" || geofenceRadiusM < 0) {
    return NextResponse.json(
      { error: "geofenceRadiusM must be a non-negative number" },
      { status: 400 },
    );
  }
  if (!geofenceMode || !GEOFENCE_MODES.includes(geofenceMode)) {
    return NextResponse.json(
      { error: "geofenceMode must be off, warn, or block" },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const site = await timeStore.upsertSite(
    {
      name,
      lat,
      lng,
      geofenceRadiusM,
      geofenceMode,
      active,
      id,
    },
    { unionId, localId },
  );

  await auditLog.log({
    userId: session.user.id,
    action: "time.sites.upsert",
    resourceType: "work_site",
    resourceId: site.id,
    unionId,
    localId,
  });

  return NextResponse.json({ site }, { status: id ? 200 : 201 });
}
