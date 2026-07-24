import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTravelView,
  requireTravelSession,
} from "@/lib/auth/travel-session";
import { canElevateTravel } from "@/lib/travel/access";
import { ledgerStore } from "@/lib/ledger/store";
import { travelStore } from "@/lib/travel/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { issueAdvanceSchema } from "@/lib/validation/travel";
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
  if (existing.status !== "approved") {
    return NextResponse.json(
      { error: "Advance requires an approved authorization" },
      { status: 409 },
    );
  }

  const already = await travelStore.getAdvanceForAuth(id);
  if (already) {
    return NextResponse.json(
      { error: "Advance already issued" },
      { status: 409 },
    );
  }

  const raw = await request.json();
  const parsed = parseJsonBody(issueAdvanceSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const ledgerEntry = await ledgerStore.create(
    {
      date: new Date().toISOString().slice(0, 10),
      description: `Travel advance: ${existing.eventName} (${existing.id})`,
      amount: parsed.data.amount,
      type: "expense",
      category: "travel_advance",
    },
    {
      unionId: existing.unionId,
      localId: existing.localId,
      recordedById: session.user.id,
    },
  );

  let advance;
  try {
    advance = await travelStore.issueAdvance(
      id,
      { amount: parsed.data.amount },
      {
        unionId: existing.unionId,
        localId: existing.localId,
        issuedById: session.user.id,
        ledgerEntryId: ledgerEntry.id,
      },
    );
  } catch {
    await ledgerStore.remove(ledgerEntry.id);
    return NextResponse.json(
      { error: "Could not issue advance" },
      { status: 409 },
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "travel.advance",
    resourceType: "cash_advance",
    resourceId: advance.id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ advance, ledgerEntry }, { status: 201 });
}
