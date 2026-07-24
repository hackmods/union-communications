import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForLedgerSession,
  requireLedgerSession,
  tenantIdsForLedgerSession,
} from "@/lib/auth/ledger-session";
import { canMutateLedger } from "@/lib/ledger/access";
import { withRunningBalance } from "@/lib/ledger/running-balance";
import { ledgerStore } from "@/lib/ledger/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createLedgerEntrySchema } from "@/lib/validation/ledger";
import type { LedgerEntryType } from "@/types/ledger";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requireLedgerSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const filters = listFiltersForLedgerSession(session);
  const typeParam = url.searchParams.get("type");
  const type =
    typeParam === "income" || typeParam === "expense"
      ? (typeParam as LedgerEntryType)
      : undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;

  const entries = await ledgerStore.list({
    ...filters,
    type,
    category,
    from,
    to,
  });
  const withBalance = withRunningBalance(entries);
  const balance =
    withBalance.length > 0
      ? withBalance[withBalance.length - 1].runningBalance
      : 0;

  await auditLog.log({
    userId: session.user.id,
    action: "ledger.list",
    resourceType: "ledger_entry",
    resourceId: "*",
    unionId: filters.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ entries: withBalance, balance });
}

export async function POST(request: Request) {
  const authResult = await requireLedgerSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canMutateLedger(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.user.localId && !session.user.unionId) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createLedgerEntrySchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const tenant = tenantIdsForLedgerSession(session);
  if (!session.user.localId) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const entry = await ledgerStore.create(parsed.data, {
    unionId: tenant.unionId,
    localId: tenant.localId,
    recordedById: session.user.id,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "ledger.create",
    resourceType: "ledger_entry",
    resourceId: entry.id,
    unionId: entry.unionId,
    localId: entry.localId,
  });

  return NextResponse.json({ entry }, { status: 201 });
}
