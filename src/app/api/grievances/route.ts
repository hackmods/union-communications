import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  listFiltersForSession,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { grievanceStore } from "@/lib/grievance/memory-adapter";
import { resolveGrievanceConfig } from "@/lib/tenant/loader";
import { getCurrentStepDueDate } from "@/lib/grievance/deadlines";
import { isElevatedGrievanceRole } from "@/lib/grievance/access";
import { parseJsonBody } from "@/lib/validation/parse";
import { createGrievanceSchema } from "@/lib/validation/grievance";
import type { UserRole } from "@/types/tenant";

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
    ? resolveGrievanceConfig(session.user.unionId, {
        bargainingUnitId: session.user.bargainingUnitId,
        localId: session.user.localId,
      })
    : undefined;

  const enriched = items.map((g) => {
    const dueConfig =
      (session.user.unionId &&
        resolveGrievanceConfig(session.user.unionId, {
          bargainingUnitId: g.bargainingUnitId,
          localId: g.localId,
        })) ||
      config;
    const due =
      dueConfig &&
      getCurrentStepDueDate(g.filedAt, g.currentStep, dueConfig);
    return {
      ...g,
      dueAt: due?.toISOString() ?? null,
      isOverdue: due
        ? due.getTime() < Date.now() && g.status !== "resolved"
        : false,
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
  const parsed = parseJsonBody(createGrievanceSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const { memberPseudonym, category, filedAt, assignedStewardId, bargainingUnitId } =
    parsed.data;

  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  const collectionId =
    bargainingUnitId || session.user.bargainingUnitId;

  const stewardId =
    assignedStewardId && isElevatedGrievanceRole(roles)
      ? assignedStewardId
      : session.user.id;

  const created = await grievanceStore.create(
    {
      memberPseudonym,
      category,
      filedAt,
      assignedStewardId: stewardId,
      bargainingUnitId: collectionId,
    },
    {
      unionId,
      localId,
      bargainingUnitId: collectionId,
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
