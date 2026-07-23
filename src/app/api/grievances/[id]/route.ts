import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  assertGrievanceEdit,
  assertGrievanceView,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { grievanceStore } from "@/lib/grievance/memory-adapter";
import { getTenantContext } from "@/lib/tenant/loader";
import { getCurrentStepDueDate, isOverdue } from "@/lib/grievance/deadlines";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateGrievanceSchema } from "@/lib/validation/grievance";
import type { GrievanceConfig } from "@/types/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const data = await grievanceStore.getById(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session } = authResult;
  if (!assertGrievanceView(session, data.grievance)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenant = getTenantContext(data.grievance.unionId);
  const config = tenant?.grievanceConfig;
  const due =
    config &&
    getCurrentStepDueDate(
      data.grievance.filedAt,
      data.grievance.currentStep,
      config as GrievanceConfig,
    );

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.view",
    resourceType: "grievance",
    resourceId: id,
    unionId: data.grievance.unionId,
    localId: data.grievance.localId,
  });

  return NextResponse.json({
    ...data,
    dueAt: due?.toISOString() ?? null,
    isOverdue:
      due != null &&
      data.grievance.status !== "resolved" &&
      isOverdue(due),
    grievanceConfig: config ?? null,
    localNumber: tenant?.local?.localNumber,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const existing = await grievanceStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session } = authResult;
  if (!assertGrievanceEdit(session, existing.grievance)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseJsonBody(updateGrievanceSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const updated = await grievanceStore.update(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    parsed.data.currentStep &&
    parsed.data.currentStep !== existing.grievance.currentStep
  ) {
    await grievanceStore.addEvent(id, {
      type: "escalation",
      stepNumber: parsed.data.currentStep,
    });
  }

  if (
    parsed.data.status === "resolved" &&
    existing.grievance.status !== "resolved"
  ) {
    await grievanceStore.addEvent(id, {
      type: "resolution",
      completedAt: new Date().toISOString(),
    });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.update",
    resourceType: "grievance",
    resourceId: id,
    unionId: updated.unionId,
    localId: updated.localId,
  });

  return NextResponse.json({ grievance: updated });
}
