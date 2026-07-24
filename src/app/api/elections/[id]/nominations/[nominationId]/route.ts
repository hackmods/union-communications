import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertElectionView,
  requireElectionsSession,
} from "@/lib/auth/elections-session";
import { canMutateElections } from "@/lib/elections/access";
import { electionsStore } from "@/lib/elections/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateNominationSchema } from "@/lib/validation/elections";
import type { UserRole } from "@/types/tenant";

type RouteContext = {
  params: Promise<{ id: string; nominationId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireElectionsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canMutateElections(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, nominationId } = await context.params;
  const existing = await electionsStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertElectionView(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(updateNominationSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const cycle = await electionsStore.updateNomination(
    id,
    nominationId,
    parsed.data,
  );
  if (!cycle) {
    return NextResponse.json({ error: "Nomination not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "elections.nomination.update",
    resourceType: "election_cycle",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ cycle });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireElectionsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canMutateElections(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, nominationId } = await context.params;
  const existing = await electionsStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertElectionView(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cycle = await electionsStore.removeNomination(id, nominationId);
  if (!cycle) {
    return NextResponse.json({ error: "Nomination not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "elections.nomination.delete",
    resourceType: "election_cycle",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ cycle });
}
