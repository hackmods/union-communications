import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertBumpingEdit,
  requireBumpingSession,
} from "@/lib/auth/bumping-session";
import { bumpingStore } from "@/lib/bumping/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireBumpingSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const existing = await bumpingStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session } = authResult;
  if (!assertBumpingEdit(session, existing.bumpingCase)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.outcome?.trim() || !body.rationale?.trim()) {
    return NextResponse.json(
      { error: "outcome and rationale are required" },
      { status: 400 },
    );
  }

  const decision = await bumpingStore.recordDecision(
    id,
    {
      outcome: body.outcome.trim(),
      rationale: body.rationale.trim(),
      dissentNotes: body.dissentNotes?.trim(),
    },
    { recordedById: session.user.id },
  );

  await auditLog.log({
    userId: session.user.id,
    action: "bumping.decision.record",
    resourceType: "decision_record",
    resourceId: decision?.id ?? id,
    unionId: existing.bumpingCase.unionId,
    localId: existing.bumpingCase.localId,
  });

  return NextResponse.json({ decision }, { status: 201 });
}
