import { NextResponse } from "next/server";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { decideCapability } from "@/lib/authorization/model";
import { isPostgresConfigured } from "@/lib/db/client";
import { listActiveGrievanceLocalMembers } from "@/lib/grievance/local-members";

/** Safe, local-scoped choices for the grievance intake form. */
export async function GET() {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { session, actor } = authResult;
  const unionId = session.user.unionId;
  const localId = session.user.localId;
  const canCreate = Boolean(unionId && localId && decideCapability(
    actor,
    "grievances.case.write",
    { unionId, localId },
  ).allowed);
  const canManageAccess = Boolean(unionId && localId && decideCapability(
    actor,
    "grievances.access.manage",
    { unionId, localId },
  ).allowed);

  if (!canCreate || !unionId || !localId || !isPostgresConfigured() || actor.source !== "database") {
    return NextResponse.json({ members: [], caseWorkers: [], canCreate, canManageAccess, allowRestricted: canManageAccess });
  }

  const rls = rlsContextForActor(session, actor) ?? {};
  const members = (await listActiveGrievanceLocalMembers({ unionId, localId, rls }))
    .map(({ id, name }) => ({ id, name }));

  const caseWorkers = canManageAccess ? members : [];

  return NextResponse.json({ members, caseWorkers, canCreate, canManageAccess, allowRestricted: canManageAccess });
}
