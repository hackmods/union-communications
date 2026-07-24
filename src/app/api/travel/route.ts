import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForTravelSession,
  requireTravelSession,
  tenantIdsForTravelSession,
} from "@/lib/auth/travel-session";
import { canCreateTravelAuth } from "@/lib/travel/access";
import { travelStore } from "@/lib/travel/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createTravelAuthorizationSchema } from "@/lib/validation/travel";
import type { TravelAuthStatus } from "@/types/travel";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requireTravelSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const filters = listFiltersForTravelSession(session);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "requested" ||
    statusParam === "approved" ||
    statusParam === "denied"
      ? (statusParam as TravelAuthStatus)
      : undefined;
  const mine = url.searchParams.get("mine") === "1";

  const authorizations = await travelStore.listAuthorizations({
    ...filters,
    status,
    ...(mine ? { requestedById: session.user.id } : {}),
  });

  const enriched = await Promise.all(
    authorizations.map(async (auth) => {
      const [advance, claim] = await Promise.all([
        travelStore.getAdvanceForAuth(auth.id),
        travelStore.getClaimForAuth(auth.id),
      ]);
      return { authorization: auth, advance, claim };
    }),
  );

  await auditLog.log({
    userId: session.user.id,
    action: "travel.list",
    resourceType: "travel_authorization",
    resourceId: "*",
    unionId: filters.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ items: enriched });
}

export async function POST(request: Request) {
  const authResult = await requireTravelSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canCreateTravelAuth(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.user.localId) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createTravelAuthorizationSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const tenant = tenantIdsForTravelSession(session);
  const authorization = await travelStore.createAuthorization(parsed.data, {
    unionId: tenant.unionId,
    localId: tenant.localId,
    requestedById: session.user.id,
    requestedByName: session.user.name ?? session.user.email ?? "Officer",
  });

  await auditLog.log({
    userId: session.user.id,
    action: "travel.create",
    resourceType: "travel_authorization",
    resourceId: authorization.id,
    unionId: authorization.unionId,
    localId: authorization.localId,
  });

  return NextResponse.json({ authorization }, { status: 201 });
}
