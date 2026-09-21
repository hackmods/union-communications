import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { committeesDbBackend } from "@/lib/db/backend";
import {
  listFiltersForCommitteesSession,
  requireCommitteesSession,
  tenantIdsForCommitteesSession,
  withCommitteesRls,
} from "@/lib/auth/committees-session";
import { canMutateCommittees } from "@/lib/committees/access";
import { committeesStore } from "@/lib/committees/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createCommitteeSchema } from "@/lib/validation/committees";
import type { UserRole } from "@/types/tenant";

export async function GET() {
  const authResult = await requireCommitteesSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const filters = listFiltersForCommitteesSession(session);
  const committees = await withCommitteesRls(session, () => committeesStore.list(filters), filters.localId);

  await auditLog.log({
    userId: session.user.id,
    action: "committees.list",
    resourceType: "committee",
    resourceId: "*",
    unionId: filters.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ committees });
}

export async function POST(request: Request) {
  const authResult = await requireCommitteesSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canMutateCommittees(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.user.localId) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createCommitteeSchema, raw);
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

  const tenant = tenantIdsForCommitteesSession(session);
  let committee;
  try {
    committee = await withCommitteesRls(session, () => committeesStore.create(parsed.data, {
      unionId: tenant.unionId,
      localId: tenant.localId,
    }), tenant.localId);
  } catch (error) {
    if (error instanceof Error && error.name === "InvalidCommitteeMembersError") {
      return NextResponse.json({ error: "Committee members must be active members of this local" }, { status: 400 });
    }
    throw error;
  }

  await auditLog.log({
    userId: session.user.id,
    action: "committees.create",
    resourceType: "committee",
    resourceId: committee.id,
    unionId: committee.unionId,
    localId: committee.localId,
  });

  return NextResponse.json({ committee }, { status: 201 });
}
