import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertLedgerView,
  requireLedgerSession,
} from "@/lib/auth/ledger-session";
import { canMutateLedger } from "@/lib/ledger/access";
import { ledgerStore } from "@/lib/ledger/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateLedgerEntrySchema } from "@/lib/validation/ledger";
import type { UserRole } from "@/types/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireLedgerSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const entry = await ledgerStore.getById(id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertLedgerView(authResult.session, entry)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ entry });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireLedgerSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canMutateLedger(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await ledgerStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertLedgerView(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(updateLedgerEntrySchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const updated = await ledgerStore.update(id, parsed.data);
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "ledger.update",
    resourceType: "ledger_entry",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ entry: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireLedgerSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canMutateLedger(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await ledgerStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertLedgerView(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ledgerStore.remove(id);
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "ledger.delete",
    resourceType: "ledger_entry",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
