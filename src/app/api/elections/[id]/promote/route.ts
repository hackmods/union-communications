import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertElectionView,
  requireElectionsSession,
} from "@/lib/auth/elections-session";
import { canMutateElections } from "@/lib/elections/access";
import { electionsStore } from "@/lib/elections/store";
import { officerRosterStore } from "@/lib/officers/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { promoteToRosterSchema } from "@/lib/validation/elections";
import type { UserRole } from "@/types/tenant";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Promote a tallied (or nominated) winner onto the officer roster (ORG-002).
 * Does not cast online votes — roster update only.
 */
export async function POST(request: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const existing = await electionsStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertElectionView(authResult.session, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(promoteToRosterSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const result = await electionsStore.promoteToRoster(
    id,
    parsed.data,
    (input, meta) => officerRosterStore.create(input, meta),
  );
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "elections.promote_roster",
    resourceType: "officer_roster",
    resourceId: result.officer.id,
    unionId: result.cycle.unionId,
    localId: result.cycle.localId,
  });

  return NextResponse.json({
    cycle: result.cycle,
    officer: result.officer,
  });
}
