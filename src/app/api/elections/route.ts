import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForElectionsSession,
  requireElectionsSession,
  tenantIdsForElectionsSession,
} from "@/lib/auth/elections-session";
import { canMutateElections } from "@/lib/elections/access";
import { electionsStore } from "@/lib/elections/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createElectionCycleSchema } from "@/lib/validation/elections";
import type { ElectionCycleStatus } from "@/types/elections";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requireElectionsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "open" ||
    statusParam === "closed" ||
    statusParam === "tallied"
      ? (statusParam as ElectionCycleStatus)
      : undefined;
  const filters = listFiltersForElectionsSession(session);
  const cycles = await electionsStore.list({ ...filters, status });

  await auditLog.log({
    userId: session.user.id,
    action: "elections.list",
    resourceType: "election_cycle",
    resourceId: "*",
    unionId: filters.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ cycles });
}

export async function POST(request: Request) {
  const authResult = await requireElectionsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canMutateElections(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.user.localId) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createElectionCycleSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const tenant = tenantIdsForElectionsSession(session);
  const cycle = await electionsStore.create(parsed.data, {
    unionId: tenant.unionId,
    localId: tenant.localId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "elections.create",
    resourceType: "election_cycle",
    resourceId: cycle.id,
    unionId: cycle.unionId,
    localId: cycle.localId,
  });

  return NextResponse.json({ cycle }, { status: 201 });
}
