import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  listFiltersForSession,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { grievanceStore } from "@/lib/grievance/memory-adapter";
import { getTenantContext } from "@/lib/tenant/loader";
import { getCurrentStepDueDate } from "@/lib/grievance/deadlines";
import { isElevatedGrievanceRole } from "@/lib/grievance/access";
import type { UserRole } from "@/types/tenant";
import type { GrievanceConfig } from "@/types/tenant";

export async function GET() {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const filters = listFiltersForSession(session);
  const items = await grievanceStore.list(filters);

  const config = session.user.unionId
    ? getTenantContext(session.user.unionId)?.grievanceConfig
    : undefined;

  const enriched = items.map((g) => {
    const due =
      config &&
      getCurrentStepDueDate(g.filedAt, g.currentStep, config as GrievanceConfig);
    return {
      ...g,
      dueAt: due?.toISOString() ?? null,
      isOverdue: due ? due.getTime() < Date.now() && g.status !== "resolved" : false,
    };
  });

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.list",
    resourceType: "grievance",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ grievances: enriched });
}

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
  if (roles.includes("local_exec")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { memberPseudonym, category, filedAt, assignedStewardId } = body;

  if (!category || !filedAt) {
    return NextResponse.json(
      { error: "category and filedAt are required" },
      { status: 400 },
    );
  }

  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;

  const stewardId =
    assignedStewardId && isElevatedGrievanceRole(roles)
      ? assignedStewardId
      : session.user.id;

  const created = await grievanceStore.create(
    { memberPseudonym, category, filedAt, assignedStewardId: stewardId },
    {
      unionId,
      localId,
      createdById: session.user.id,
      assignedStewardId: stewardId,
    },
  );

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.create",
    resourceType: "grievance",
    resourceId: created.grievance.id,
    unionId,
    localId,
  });

  return NextResponse.json(created, { status: 201 });
}
