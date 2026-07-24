import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTravelView,
  requireTravelSession,
} from "@/lib/auth/travel-session";
import { canElevateTravel } from "@/lib/travel/access";
import { reconcileDifference, roundMoney } from "@/lib/travel/reconcile";
import { ledgerStore } from "@/lib/ledger/store";
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
  const authorization = await travelStore.getAuthorization(id);
  if (!authorization || !assertTravelView(session, authorization)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const claim = await travelStore.getClaimForAuth(id);
  if (!claim) {
    return NextResponse.json({ error: "No claim to reconcile" }, { status: 404 });
  }
  if (claim.status === "reconciled") {
    return NextResponse.json({ error: "Already reconciled" }, { status: 409 });
  }

  const advance = await travelStore.getAdvanceForAuth(id);
  const advanceAmount = advance?.amount ?? claim.advanceAmount;
  const difference = reconcileDifference(claim.lineItems, advanceAmount);

  let reconcileLedgerEntryId: string | undefined;
  if (Math.abs(difference) >= 0.01) {
    const isExpense = difference > 0;
    const ledgerEntry = await ledgerStore.create(
      {
        date: new Date().toISOString().slice(0, 10),
        description: isExpense
          ? `Travel reconcile (additional reimbursement): ${authorization.eventName}`
          : `Travel reconcile (unused advance returned): ${authorization.eventName}`,
        amount: roundMoney(Math.abs(difference)),
        type: isExpense ? "expense" : "income",
        category: "travel_reconcile",
      },
      {
        unionId: authorization.unionId,
        localId: authorization.localId,
        recordedById: session.user.id,
      },
    );
    reconcileLedgerEntryId = ledgerEntry.id;
  }

  const reconciled = await travelStore.reconcileClaim(claim.id, {
    reconciledById: session.user.id,
    difference,
    reconcileLedgerEntryId,
  });
  if (!reconciled) {
    return NextResponse.json({ error: "Could not reconcile" }, { status: 409 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "travel.reconcile",
    resourceType: "expense_claim",
    resourceId: reconciled.id,
    unionId: reconciled.unionId,
    localId: reconciled.localId,
  });

  return NextResponse.json({ claim: reconciled, difference });
}
