import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTravelView,
  requireTravelSession,
} from "@/lib/auth/travel-session";
import {
  canEditDraftClaim,
} from "@/lib/travel/access";
import { travelStore } from "@/lib/travel/store";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  createExpenseClaimSchema,
  updateExpenseClaimSchema,
} from "@/lib/validation/travel";
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

  const claim = await travelStore.getClaimForAuth(id);
  return NextResponse.json({ claim });
}

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
  const { id } = await context.params;
  const authorization = await travelStore.getAuthorization(id);
  if (!authorization || !assertTravelView(session, authorization)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (authorization.status !== "approved") {
    return NextResponse.json(
      { error: "Claims require an approved authorization" },
      { status: 409 },
    );
  }

  const isOwner = authorization.requestedById === session.user.id;
  const roles = (session.user.roles ?? []) as UserRole[];
  const elevated =
    roles.includes("solo_account") ||
    roles.some((r) =>
      [
        "platform_admin",
        "union_admin",
        "division_admin",
        "local_president",
        "local_exec",
      ].includes(r),
    );
  if (!isOwner && !elevated) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createExpenseClaimSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const advance = await travelStore.getAdvanceForAuth(id);
  try {
    const claim = await travelStore.createClaim(
      {
        travelAuthorizationId: id,
        lineItems: parsed.data.lineItems,
      },
      {
        unionId: authorization.unionId,
        localId: authorization.localId,
        claimantId: session.user.id,
        advanceAmount: advance?.amount ?? 0,
      },
    );

    await auditLog.log({
      userId: session.user.id,
      action: "travel.claim.create",
      resourceType: "expense_claim",
      resourceId: claim.id,
      unionId: claim.unionId,
      localId: claim.localId,
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Claim already exists" },
      { status: 409 },
    );
  }
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
  const authorization = await travelStore.getAuthorization(id);
  if (!authorization || !assertTravelView(session, authorization)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await travelStore.getClaimForAuth(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canEditDraftClaim(existing, session.user.id, roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(updateExpenseClaimSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const claim = await travelStore.updateClaim(existing.id, parsed.data);
  if (!claim) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "travel.claim.update",
    resourceType: "expense_claim",
    resourceId: claim.id,
    unionId: claim.unionId,
    localId: claim.localId,
  });

  return NextResponse.json({ claim });
}
