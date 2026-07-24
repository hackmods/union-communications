import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTravelView,
  requireTravelSession,
} from "@/lib/auth/travel-session";
import { canElevateTravel } from "@/lib/travel/access";
import { travelStore } from "@/lib/travel/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { denyTravelSchema } from "@/lib/validation/travel";
import type { UserRole } from "@/types/tenant";

export async function POST(
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
      { error: "Only requested authorizations can be denied" },
      { status: 409 },
    );
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = parseJsonBody(denyTravelSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const authorization = await travelStore.denyAuthorization(
    id,
    session.user.id,
    parsed.data.reason,
  );
  if (!authorization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "travel.deny",
    resourceType: "travel_authorization",
    resourceId: authorization.id,
    unionId: authorization.unionId,
    localId: authorization.localId,
  });

  return NextResponse.json({ authorization });
}
