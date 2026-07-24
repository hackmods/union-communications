import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTravelView,
  requireTravelSession,
} from "@/lib/auth/travel-session";
import {
  canDeleteTravelAuth,
  canEditDraftTravelAuth,
} from "@/lib/travel/access";
import { travelStore } from "@/lib/travel/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateTravelAuthorizationSchema } from "@/lib/validation/travel";
import type { UserRole } from "@/types/tenant";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireTravelSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id } = await context.params;
  const authorization = await travelStore.getAuthorization(id);
  if (!authorization || !assertTravelView(session, authorization)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [advance, claim] = await Promise.all([
    travelStore.getAdvanceForAuth(id),
    travelStore.getClaimForAuth(id),
  ]);

  return NextResponse.json({ authorization, advance, claim });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireTravelSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  const { id } = await context.params;
  const existing = await travelStore.getAuthorization(id);
  if (!existing || !assertTravelView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canEditDraftTravelAuth(existing, session.user.id, roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(updateTravelAuthorizationSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const authorization = await travelStore.updateAuthorization(id, parsed.data);
  if (!authorization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "travel.update",
    resourceType: "travel_authorization",
    resourceId: authorization.id,
    unionId: authorization.unionId,
    localId: authorization.localId,
  });

  return NextResponse.json({ authorization });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireTravelSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  const { id } = await context.params;
  const existing = await travelStore.getAuthorization(id);
  if (!existing || !assertTravelView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canDeleteTravelAuth(existing, session.user.id, roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await travelStore.removeAuthorization(id);
  if (!ok) {
    return NextResponse.json({ error: "Cannot delete" }, { status: 409 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "travel.delete",
    resourceType: "travel_authorization",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
