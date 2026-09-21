import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { grievanceStore } from "@/lib/grievance/store";
import { getTenantContext } from "@/lib/tenant/loader";
import { getCurrentStepDueDate, isOverdue } from "@/lib/grievance/deadlines";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateGrievanceSchema } from "@/lib/validation/grievance";
import { authorizeGrievance, grievanceSummary } from "@/lib/grievance/authorization";
import { decideCapability } from "@/lib/authorization/model";
import { and, eq, isNull, lte } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { grievanceParticipants, localMemberships } from "@/lib/db/schema";
import type { GrievanceConfig } from "@/types/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id } = await context.params;
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const access = await authorizeGrievance(actor, data.grievance);
  if (!access.allowed || access.level === "member_safe") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tenant = getTenantContext(data.grievance.unionId);
  const config = tenant?.grievanceConfig;
  const due =
    config &&
    getCurrentStepDueDate(
      data.grievance.filedAt,
      data.grievance.currentStep,
      config as GrievanceConfig,
    );

  await withRlsContext(rls, () => auditLog.log({
    userId: session.user.id,
    action: "grievance.view",
    resourceType: "grievance",
    resourceId: id,
    unionId: data.grievance.unionId,
    localId: data.grievance.localId,
  }));
  if (access.reason === "break_glass") {
    await withRlsContext(rls, () => auditLog.log({
      userId: session.user.id,
      action: "grievance.break_glass.use",
      resourceType: "grievance",
      resourceId: id,
      unionId: data.grievance.unionId,
      localId: data.grievance.localId,
      metadata: { grantId: access.relationship ?? "" },
    }));
  }

  if (access.level === "summary") {
    return NextResponse.json({
      grievance: grievanceSummary(data.grievance),
      events: [],
      notes: [],
      communications: [],
      meetings: [],
      summaryOnly: true,
      dueAt: due?.toISOString() ?? null,
      authorization: { level: access.level, reason: access.reason, canManageAccess: false, canPublishMemberUpdates: false },
    });
  }

  return NextResponse.json({
    ...data,
    authorization: {
      level: access.level,
      reason: access.reason,
      canManageAccess: decideCapability(actor, "grievances.access.manage", { unionId: data.grievance.unionId, localId: data.grievance.localId }).allowed,
      canPublishMemberUpdates: decideCapability(actor, "grievances.member_updates.publish", { unionId: data.grievance.unionId, localId: data.grievance.localId }).allowed,
    },
    dueAt: due?.toISOString() ?? null,
    isOverdue:
      due != null &&
      data.grievance.status !== "resolved" &&
      isOverdue(due),
    grievanceConfig: config ?? null,
    localNumber: tenant?.local?.localNumber,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id } = await context.params;
  const existing = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await authorizeGrievance(actor, existing.grievance);
  if (!access.allowed || access.level !== "case_write") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = parseJsonBody(updateGrievanceSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const changesAccess = parsed.data.privacyMode !== undefined || parsed.data.assignedStewardId !== undefined;
  if (changesAccess && !decideCapability(actor, "grievances.access.manage", {
    unionId: existing.grievance.unionId,
    localId: existing.grievance.localId,
  }).allowed) {
    return NextResponse.json({ error: "Grievance access authority is required for privacy or case-worker changes" }, { status: 403 });
  }
  if (parsed.data.assignedStewardId) {
    if (!isPostgresConfigured()) return NextResponse.json({ error: "Case-worker assignment requires durable database storage" }, { status: 503 });
    const [membership] = await withRlsContext(rls, () => getDb().select({ id: localMemberships.id })
      .from(localMemberships).where(and(
        eq(localMemberships.unionId, existing.grievance.unionId),
        eq(localMemberships.localId, existing.grievance.localId),
        eq(localMemberships.userId, parsed.data.assignedStewardId!),
        eq(localMemberships.status, "active"), isNull(localMemberships.endedAt),
        lte(localMemberships.startedAt, new Date()),
      )).limit(1));
    if (!membership) return NextResponse.json({ error: "Case worker must be an active member of this local" }, { status: 400 });
  }

  const updated = await withRlsContext(rls, () =>
    grievanceStore.update(id, parsed.data),
  );
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.assignedStewardId && parsed.data.assignedStewardId !== existing.grievance.assignedStewardId) {
    await withRlsContext(rls, async () => {
      const [participant] = await getDb().select({ id: grievanceParticipants.id }).from(grievanceParticipants).where(and(
        eq(grievanceParticipants.grievanceId, id),
        eq(grievanceParticipants.userId, parsed.data.assignedStewardId!),
      )).limit(1);
      if (participant) {
        await getDb().update(grievanceParticipants).set({ relationship: "case_worker", accessLevel: "case_write", revokedAt: null, addedById: session.user.id, createdAt: new Date() }).where(eq(grievanceParticipants.id, participant.id));
      } else {
        await getDb().insert(grievanceParticipants).values({ id: crypto.randomUUID(), grievanceId: id, userId: parsed.data.assignedStewardId!, relationship: "case_worker", accessLevel: "case_write", addedById: session.user.id });
      }
    });
  }

  if (
    parsed.data.currentStep &&
    parsed.data.currentStep !== existing.grievance.currentStep
  ) {
    await withRlsContext(rls, () =>
      grievanceStore.addEvent(id, {
        type: "escalation",
        stepNumber: parsed.data.currentStep,
      }),
    );
  }

  if (
    parsed.data.status === "resolved" &&
    existing.grievance.status !== "resolved"
  ) {
    await withRlsContext(rls, () =>
      grievanceStore.addEvent(id, {
        type: "resolution",
        completedAt: new Date().toISOString(),
      }),
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.update",
    resourceType: "grievance",
    resourceId: id,
    unionId: updated.unionId,
    localId: updated.localId,
  });

  if (parsed.data.privacyMode !== undefined && parsed.data.privacyMode !== existing.grievance.privacyMode) {
    await auditLog.log({ userId: session.user.id, action: "grievance.privacy.change", resourceType: "grievance", resourceId: id, unionId: updated.unionId, localId: updated.localId, metadata: { privacyMode: parsed.data.privacyMode } });
  }

  return NextResponse.json({ grievance: updated });
}
