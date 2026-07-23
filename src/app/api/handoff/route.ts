import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForSession,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import {
  buildHandoffPackage,
  canInitiateHandoff,
} from "@/lib/handoff/package";
import { grievanceStore } from "@/lib/grievance/store";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import type { UserRole } from "@/types/tenant";

/** GET - preview grievances eligible for handoff + steward candidates */
export async function GET() {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canInitiateHandoff(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filters = listFiltersForSession(session);
  const grievances = await grievanceStore.list({
    ...filters,
    localId: session.user.localId,
  });
  const open = grievances.filter((g) => g.status !== "resolved");

  const stewards = DEMO_USERS.filter(
    (u) =>
      u.unionId === session.user.unionId &&
      u.localId === session.user.localId &&
      u.roles.includes("local_steward"),
  ).map((u) => ({ id: u.id, name: u.name, email: u.email }));

  return NextResponse.json({ grievances: open, stewards });
}

/** POST - reassign selected grievances and return handoff package */
export async function POST(request: Request) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canInitiateHandoff(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId || !localId) {
    return NextResponse.json(
      { error: "Union and local required" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { toStewardId, toStewardName, grievanceIds, notes } = body as {
    toStewardId?: string;
    toStewardName?: string;
    grievanceIds?: string[];
    notes?: string;
  };

  if (!toStewardId || !toStewardName || !Array.isArray(grievanceIds)) {
    return NextResponse.json(
      { error: "toStewardId, toStewardName, and grievanceIds are required" },
      { status: 400 },
    );
  }

  const reassigned = [];
  for (const gid of grievanceIds) {
    const data = await grievanceStore.getById(gid);
    if (!data) continue;
    if (data.grievance.unionId !== unionId || data.grievance.localId !== localId) {
      continue;
    }
    const updated = await grievanceStore.update(gid, {
      assignedStewardId: toStewardId,
    });
    if (updated) {
      await grievanceStore.addNote(
        gid,
        {
          body: `Officer handoff to ${toStewardName}.${notes ? ` Notes: ${notes}` : ""}`,
        },
        {
          authorId: session.user.id,
          authorName: session.user.name ?? "Officer",
        },
      );
      reassigned.push(updated);
    }
  }

  const handoffPackage = buildHandoffPackage({
    unionId,
    localId,
    fromOfficerId: session.user.id,
    request: {
      toStewardId,
      toStewardName,
      grievanceIds: reassigned.map((g) => g.id),
      notes,
    },
    grievances: reassigned,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "handoff.complete",
    resourceType: "handoff",
    resourceId: `${unionId}:${localId}`,
    unionId,
    localId,
    metadata: {
      toStewardId,
      count: String(reassigned.length),
    },
  });

  return NextResponse.json({
    reassigned: reassigned.length,
    package: handoffPackage,
  });
}
