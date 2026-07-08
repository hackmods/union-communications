import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  assertBumpingEdit,
  assertBumpingView,
  requireBumpingSession,
} from "@/lib/auth/bumping-session";
import { bumpingStore } from "@/lib/bumping/memory-adapter";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireBumpingSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const data = await bumpingStore.getById(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session } = authResult;
  if (!assertBumpingView(session, data.bumpingCase)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "bumping.view",
    resourceType: "bumping_case",
    resourceId: id,
    unionId: data.bumpingCase.unionId,
    localId: data.bumpingCase.localId,
  });

  return NextResponse.json(data);
}

export async function PATCH(request: Request, context: RouteContext) {
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
  const updated = await bumpingStore.update(id, body);

  await auditLog.log({
    userId: session.user.id,
    action: "bumping.update",
    resourceType: "bumping_case",
    resourceId: id,
    unionId: existing.bumpingCase.unionId,
    localId: existing.bumpingCase.localId,
  });

  return NextResponse.json({ bumpingCase: updated });
}
