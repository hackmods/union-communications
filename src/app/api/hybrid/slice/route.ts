import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  assertGrievanceView,
  listFiltersForSession,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import {
  isBumpingModuleEnabled,
  listFiltersForBumpingSession,
} from "@/lib/auth/bumping-session";
import { canViewBumpingCase } from "@/lib/bumping/access";
import { bumpingStore } from "@/lib/bumping/memory-adapter";
import { grievanceStore } from "@/lib/grievance/memory-adapter";
import {
  assertSliceTenantScope,
  buildHybridSlice,
  isHybridDataSlice,
} from "@/lib/hybrid/slice";
import type { HybridImportMode } from "@/lib/hybrid/types";
import type { UserRole } from "@/types/tenant";
import type { BumpingCaseWithRelations } from "@/types/bumping";
import type { GrievanceWithRelations } from "@/types/grievance";

function canImportHybridSlice(roles: UserRole[]): boolean {
  if (roles.includes("local_exec")) return false;
  return (
    roles.includes("solo_account") ||
    roles.some((r) =>
      [
        "platform_admin",
        "union_admin",
        "division_admin",
        "local_president",
      ].includes(r),
    )
  );
}

/**
 * GET /api/hybrid/slice — plaintext confidential slice for the caller's local.
 * Client encrypts with a passphrase before download; passphrase never hits the server.
 */
export async function GET() {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId || !localId) {
    return NextResponse.json(
      { error: "Union and local context required for hybrid export" },
      { status: 400 },
    );
  }

  const filters = listFiltersForSession(session);
  const listed = await grievanceStore.list({
    ...filters,
    localId,
  });

  const grievances: GrievanceWithRelations[] = [];
  for (const g of listed) {
    if (!assertGrievanceView(session, g)) continue;
    const full = await grievanceStore.getById(g.id);
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

  const slice = buildHybridSlice({
    unionId,
    localId,
    grievances,
    bumpingCases,
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
    },
  });

  return NextResponse.json(slice);
}

/**
 * POST /api/hybrid/slice — import a decrypted hybrid data slice into the hub store.
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

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];

  if (!canImportHybridSlice(roles)) {
    return NextResponse.json(
      { error: "Only local officers may import a data slice" },
      { status: 403 },
    );
  }

  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId || !localId) {
    return NextResponse.json(
      { error: "Union and local context required for hybrid import" },
      { status: 400 },
    );
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

  const grevResult = await grievanceStore.importLocalSlice(
    unionId,
    localId,
    payload.slice.grievances,
    mode,
  );

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
    },
  });

  return NextResponse.json({
    grievancesImported: grevResult.imported,
    grievancesRemoved: grevResult.removed,
    bumpingImported: bumpResult.imported,
    bumpingRemoved: bumpResult.removed,
  });
}
