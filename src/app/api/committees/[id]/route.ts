import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { committeesDbBackend } from "@/lib/db/backend";
import {
  assertCommitteeView,
  requireCommitteesSession,
  withCommitteesRls,
} from "@/lib/auth/committees-session";
import { canMutateCommittees } from "@/lib/committees/access";
import { committeesStore } from "@/lib/committees/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateCommitteeSchema } from "@/lib/validation/committees";
import type { UserRole } from "@/types/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireCommitteesSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const committee = await withCommitteesRls(authResult.session, () => committeesStore.getById(id));
  if (!committee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertCommitteeView(authResult.session, committee)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ committee });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireCommitteesSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canMutateCommittees(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await withCommitteesRls(authResult.session, () => committeesStore.getById(id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertCommitteeView(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(updateCommitteeSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }
  if (parsed.data.memberUserIds !== undefined && committeesDbBackend() !== "postgres") {
    return NextResponse.json(
      { error: "Account-linked committee membership requires Postgres" },
      { status: 503 },
    );
  }

  let updated;
  try {
    updated = await withCommitteesRls(authResult.session, () => committeesStore.update(id, parsed.data));
  } catch (error) {
    if (error instanceof Error && error.name === "InvalidCommitteeMembersError") {
      return NextResponse.json({ error: "Committee members must be active members of this local" }, { status: 400 });
    }
    throw error;
  }
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "committees.update",
    resourceType: "committee",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ committee: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireCommitteesSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canMutateCommittees(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await withCommitteesRls(authResult.session, () => committeesStore.getById(id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertCommitteeView(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await withCommitteesRls(authResult.session, () => committeesStore.remove(id));
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "committees.delete",
    resourceType: "committee",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
