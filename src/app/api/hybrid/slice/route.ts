import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { decideCapability } from "@/lib/authorization/model";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import {
  listFiltersForSession,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { authorizeGrievance } from "@/lib/grievance/authorization";
import {
  isBumpingModuleEnabled,
  listFiltersForBumpingSession,
} from "@/lib/auth/bumping-session";
import {
  assertTimeView,
  isTimeModuleEnabled,
} from "@/lib/auth/time-session";
import { canViewBumpingCase } from "@/lib/bumping/access";
import { bumpingStore } from "@/lib/bumping/store";
import { grievanceStore } from "@/lib/grievance/store";
import { timeStore } from "@/lib/time/store";
import {
  assertSliceTenantScope,
  buildHybridSlice,
  isHybridDataSlice,
} from "@/lib/hybrid/slice";
import type { HybridImportMode } from "@/lib/hybrid/types";
import type { TimeEntry } from "@/types/time";
import type { UserRole } from "@/types/tenant";
import type { BumpingCaseWithRelations } from "@/types/bumping";
import type { GrievanceWithRelations } from "@/types/grievance";
import { withRlsContext } from "@/lib/db/rls-context";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { grievanceParticipants, localMemberships } from "@/lib/db/schema";
import { and, eq, isNull, lte } from "drizzle-orm";
import { randomUUID } from "node:crypto";

/**
 * GET /api/hybrid/slice - plaintext confidential slice for the caller's local.
 * Client encrypts with a passphrase before download; passphrase never hits the server.
 * Residual risk (SEC-009): payload is plaintext over TLS until the browser encrypts it.
 */
export async function GET() {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId || !localId) {
    return NextResponse.json(
      { error: "Union and local context required for hybrid export" },
      { status: 400 },
    );
  }

  const rls = rlsContextForActor(session, actor) ?? {};
  const filters = listFiltersForSession(session, actor);
  const listed = await withRlsContext(rls, () => grievanceStore.list({ ...filters, localId }));

  const grievances: GrievanceWithRelations[] = [];
  for (const g of listed) {
    const access = await authorizeGrievance(actor, g);
    if (!access.allowed || !["case_read", "case_write"].includes(access.level)) continue;
    const full = await withRlsContext(rls, () => grievanceStore.getById(g.id));
    if (full) grievances.push(full);
  }

  const bumpingCases: BumpingCaseWithRelations[] = [];
  if (isBumpingModuleEnabled(session)) {
    const roles = (session.user.roles ?? []) as UserRole[];
    const bumpFilters = listFiltersForBumpingSession(session);
    const bumpListed = await bumpingStore.list(bumpFilters);
    for (const c of bumpListed) {
      if (!canViewBumpingCase(c, unionId, localId, roles)) continue;
      const full = await bumpingStore.getById(c.id);
      if (full) bumpingCases.push(full);
    }
  }

  let timeEntries: TimeEntry[] = [];
  if (isTimeModuleEnabled(session)) {
    const timeListed = await timeStore.listEntries({ unionId, localId });
    timeEntries = timeListed.filter((e) => assertTimeView(session, e));
  }

  const slice = buildHybridSlice({
    unionId,
    localId,
    grievances,
    bumpingCases,
    timeEntries,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "hybrid.export",
    resourceType: "hybrid_slice",
    resourceId: `${unionId}:${localId}`,
    unionId,
    localId,
    metadata: {
      grievanceCount: String(grievances.length),
      bumpingCount: String(bumpingCases.length),
      timeCount: String(timeEntries.length),
    },
  });

  return NextResponse.json(slice, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });
}

/**
 * POST /api/hybrid/slice - import a decrypted hybrid data slice into the hub store.
 * Body: { slice: HybridDataSlice, mode?: "merge" | "replace" }
 */
export async function POST(request: Request) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;

  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId || !localId) {
    return NextResponse.json(
      { error: "Union and local context required for hybrid import" },
      { status: 400 },
    );
  }
  if (!decideCapability(actor, "grievances.access.manage", { unionId, localId }).allowed) {
    return NextResponse.json({ error: "Grievance access management authority is required to import a case slice" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { slice?: unknown; mode?: HybridImportMode };
  if (!isHybridDataSlice(payload.slice)) {
    return NextResponse.json(
      { error: "Invalid hybrid data slice" },
      { status: 400 },
    );
  }

  const mode: HybridImportMode =
    payload.mode === "replace" ? "replace" : "merge";

  try {
    assertSliceTenantScope(payload.slice, unionId, localId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tenant mismatch" },
      { status: 403 },
    );
  }

  const rls = rlsContextForActor(session, actor) ?? {};
  const activeLocalUserIds = new Set<string>();
  if (isPostgresConfigured() && actor.source === "database") {
    const memberships = await withRlsContext(rls, () => getDb().select({ userId: localMemberships.userId }).from(localMemberships).where(and(
      eq(localMemberships.unionId, unionId), eq(localMemberships.localId, localId), eq(localMemberships.status, "active"),
      isNull(localMemberships.endedAt), lte(localMemberships.startedAt, new Date()),
    )));
    for (const membership of memberships) activeLocalUserIds.add(membership.userId);
  } else {
    activeLocalUserIds.add(actor.userId);
  }

  const newCaseIds = new Set<string>();
  const sanitizedItems: GrievanceWithRelations[] = [];
  for (const item of payload.slice.grievances) {
    const g = item.grievance;
    const existing = await withRlsContext(rls, () => grievanceStore.getById(g.id));
    if (existing) {
      const access = await authorizeGrievance(actor, existing.grievance);
      if (!access.allowed || access.level !== "case_write") return NextResponse.json({ error: "Not found" }, { status: 404 });
      sanitizedItems.push({ ...item, grievance: {
        ...g,
        unionId,
        localId,
        assignedStewardId: existing.grievance.assignedStewardId,
        createdById: existing.grievance.createdById,
        memberUserId: existing.grievance.memberUserId,
        privacyMode: existing.grievance.privacyMode ?? "standard",
      } });
      continue;
    }
    const assignee = g.assignedStewardId || actor.userId;
    if (!activeLocalUserIds.has(assignee)) {
      return NextResponse.json({ error: "Imported case workers must be active members of this local" }, { status: 400 });
    }
    newCaseIds.add(g.id);
    sanitizedItems.push({ ...item, grievance: {
      ...g,
      unionId,
      localId,
      assignedStewardId: assignee,
      createdById: actor.userId,
      memberUserId: undefined,
      privacyMode: "standard",
    } });
  }

  const grevResult = await withRlsContext(rls, async () => {
    const result = await grievanceStore.importLocalSlice(unionId, localId, sanitizedItems, mode);
    if (newCaseIds.size && isPostgresConfigured() && actor.source === "database") {
      await getDb().insert(grievanceParticipants).values(sanitizedItems
        .filter((item) => newCaseIds.has(item.grievance.id))
        .map((item) => ({
          id: randomUUID(), grievanceId: item.grievance.id, userId: item.grievance.assignedStewardId,
          relationship: "case_worker" as const, accessLevel: "case_write" as const, addedById: actor.userId,
        }))).onConflictDoNothing();
    }
    return result;
  });

  let bumpResult = { imported: 0, removed: 0 };
  if (
    isBumpingModuleEnabled(session) &&
    payload.slice.bumpingCases.length > 0
  ) {
    bumpResult = await bumpingStore.importLocalSlice(
      unionId,
      localId,
      payload.slice.bumpingCases,
      mode,
    );
  }

  let timeResult = { imported: 0, removed: 0 };
  if (
    isTimeModuleEnabled(session) &&
    (payload.slice.timeEntries?.length ?? 0) > 0
  ) {
    timeResult = await timeStore.importLocalSlice(
      unionId,
      localId,
      payload.slice.timeEntries ?? [],
      mode,
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "hybrid.import",
    resourceType: "hybrid_slice",
    resourceId: `${unionId}:${localId}`,
    unionId,
    localId,
    metadata: {
      mode,
      grievancesImported: String(grevResult.imported),
      grievancesRemoved: String(grevResult.removed),
      bumpingImported: String(bumpResult.imported),
      bumpingRemoved: String(bumpResult.removed),
      timeImported: String(timeResult.imported),
      timeRemoved: String(timeResult.removed),
    },
  });

  return NextResponse.json({
    grievancesImported: grevResult.imported,
    grievancesRemoved: grevResult.removed,
    replaceModePreservedAbsentCases: mode === "replace",
    bumpingImported: bumpResult.imported,
    bumpingRemoved: bumpResult.removed,
    timeImported: timeResult.imported,
    timeRemoved: timeResult.removed,
  });
}
