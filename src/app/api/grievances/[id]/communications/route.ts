import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertGrievanceEdit,
  assertGrievanceView,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { grievanceStore } from "@/lib/grievance/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id } = await context.params;
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!await assertGrievanceView(actor, data.grievance)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const communications = await withRlsContext(rls, () =>
    grievanceStore.listCommunications(id),
  );
  return NextResponse.json({ communications });
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id } = await context.params;
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!await assertGrievanceEdit(actor, data.grievance)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { channel, direction, summary, occurredAt } = body;
  if (!channel || !direction || !summary || !occurredAt) {
    return NextResponse.json(
      { error: "channel, direction, summary, and occurredAt are required" },
      { status: 400 },
    );
  }

  const entry = await withRlsContext(rls, () =>
    grievanceStore.addCommunication(
      id,
      { channel, direction, summary, occurredAt },
      {
        unionId: data.grievance.unionId,
        localId: data.grievance.localId,
        loggedById: session.user.id,
        loggedByName: session.user.name ?? session.user.email ?? "Officer",
      },
    ),
  );

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.communication.create",
    resourceType: "grievance",
    resourceId: id,
    unionId: data.grievance.unionId,
    localId: data.grievance.localId,
  });

  return NextResponse.json({ communication: entry }, { status: 201 });
}
