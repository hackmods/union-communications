import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertGrievanceEdit,
  assertGrievanceView,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { grievanceStore } from "@/lib/grievance/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createGrievanceOutcomeSchema } from "@/lib/validation/grievance";

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
  const existing = await grievanceStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session } = authResult;
  if (!assertGrievanceView(session, existing.grievance)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const outcome = await grievanceStore.getOutcome(id);
  return NextResponse.json({ outcome });
}

export async function POST(request: Request, context: RouteContext) {
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
  const parsed = parseJsonBody(createGrievanceOutcomeSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const outcome = await grievanceStore.recordOutcome(id, parsed.data, {
    recordedById: session.user.id,
  });
  if (!outcome) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.outcome.record",
    resourceType: "grievance_outcome",
    resourceId: outcome.id,
    unionId: existing.grievance.unionId,
    localId: existing.grievance.localId,
  });

  return NextResponse.json({ outcome }, { status: 201 });
}
