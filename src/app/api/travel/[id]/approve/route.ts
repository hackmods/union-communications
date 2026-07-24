import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTravelView,
  requireTravelSession,
} from "@/lib/auth/travel-session";
import { canElevateTravel } from "@/lib/travel/access";
import { travelStore } from "@/lib/travel/store";
import type { UserRole } from "@/types/tenant";

export async function POST(
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
  if (!canElevateTravel(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await travelStore.getAuthorization(id);
  if (!existing || !assertTravelView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "requested") {
    return NextResponse.json(
      { error: "Only requested authorizations can be approved" },
      { status: 409 },
    );
  }

  const authorization = await travelStore.approveAuthorization(
    id,
    session.user.id,
  );
  if (!authorization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "travel.approve",
    resourceType: "travel_authorization",
    resourceId: authorization.id,
    unionId: authorization.unionId,
    localId: authorization.localId,
  });

  return NextResponse.json({ authorization });
}
