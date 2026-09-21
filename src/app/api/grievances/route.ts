import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession, listFiltersForSession } from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { decideCapability } from "@/lib/authorization/model";
import { withRlsContext } from "@/lib/db/rls-context";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { grievanceParticipants } from "@/lib/db/schema";
import { grievanceStore } from "@/lib/grievance/store";
import { listActiveGrievanceLocalMembers } from "@/lib/grievance/local-members";
import { authorizeGrievance, grievanceSummary } from "@/lib/grievance/authorization";
import { resolveGrievanceConfig } from "@/lib/tenant/loader";
import { getCurrentStepDueDate } from "@/lib/grievance/deadlines";
import { parseJsonBody } from "@/lib/validation/parse";
import { createGrievanceSchema } from "@/lib/validation/grievance";

export async function GET() {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const filters = listFiltersForSession(session, actor);
  const items = await withRlsContext(rls, () => grievanceStore.list(filters));
  const visible = [];
  for (const grievance of items) {
    const decision = await authorizeGrievance(actor, grievance);
    if (!decision.allowed) continue;
    const config = resolveGrievanceConfig(grievance.unionId, {
      bargainingUnitId: grievance.bargainingUnitId,
      localId: grievance.localId,
    });
    const due = config && getCurrentStepDueDate(grievance.filedAt, grievance.currentStep, config);
    if (decision.level === "summary") {
      visible.push({ ...grievanceSummary(grievance), dueAt: due?.toISOString() ?? null });
    } else if (decision.level === "case_read" || decision.level === "case_write") {
      visible.push({
        ...grievance,
        dueAt: due?.toISOString() ?? null,
        isOverdue: due ? due.getTime() < Date.now() && grievance.status !== "resolved" : false,
      });
    }
  }

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.list",
    resourceType: "grievance",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });
  return NextResponse.json({ grievances: visible });
}

export async function POST(request: Request) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { session, actor } = authResult;
  const body = await request.json();
  const parsed = parseJsonBody(createGrievanceSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.issues }, { status: 400 });
  }

  const input = parsed.data;
  const unionId = session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId = session.user.localId ?? `solo-local-${session.user.id}`;
  const isSolo = actor.roles.includes("solo_account") && !session.user.unionId;
  const capability = decideCapability(actor, "grievances.case.write", { unionId, localId });
  if (!isSolo && !capability.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (input.privacyMode === "restricted" && !isSolo) {
    const privacyAuthority = decideCapability(actor, "grievances.access.manage", { unionId, localId });
    if (!privacyAuthority.allowed) {
      return NextResponse.json({ error: "Restricted cases require grievance access authority" }, { status: 403 });
    }
  }

  const rls = rlsContextForActor(session, actor) ?? {};
  if (session.user.unionId && (!session.user.localId || !actor.memberships.some((m) => m.unionId === unionId && m.localId === localId))) {
    return NextResponse.json({ error: "An active local membership is required" }, { status: 403 });
  }

  const assignmentAuthority = decideCapability(actor, "grievances.access.manage", { unionId, localId }).allowed;
  const assignedStewardId = assignmentAuthority && input.assignedStewardId
    ? input.assignedStewardId
    : session.user.id;
  if (input.assignedStewardId && !assignmentAuthority) {
    return NextResponse.json({ error: "Grievance access authority is required to assign a case worker" }, { status: 403 });
  }
  const collectionId = input.bargainingUnitId || session.user.bargainingUnitId;
  const targetMembershipUserIds = [input.memberUserId, assignedStewardId].filter((id): id is string => Boolean(id));
  if (targetMembershipUserIds.length && !isSolo) {
    if (!isPostgresConfigured() || actor.source !== "database") {
      if (input.memberUserId || input.assignedStewardId) {
        return NextResponse.json({ error: "Registered member and case-worker selection requires durable membership data" }, { status: 400 });
      }
    }
    if (isPostgresConfigured() && actor.source === "database") {
      const memberRows = await listActiveGrievanceLocalMembers({ unionId, localId, rls });
      const activeUserIds = new Set(memberRows.map((row) => row.id));
      if (targetMembershipUserIds.some((userId) => !activeUserIds.has(userId))) {
        return NextResponse.json({ error: "The selected member or case worker is not active in this local" }, { status: 400 });
      }
    }
  }

  const created = await withRlsContext(rls, async () => {
    const result = await grievanceStore.create(
      {
        memberPseudonym: input.memberPseudonym,
        memberUserId: input.memberUserId,
        privacyMode: input.privacyMode ?? "standard",
        category: input.category,
        filedAt: input.filedAt,
        assignedStewardId,
        bargainingUnitId: collectionId,
      },
      {
        unionId,
        localId,
        bargainingUnitId: collectionId,
        createdById: session.user.id,
        assignedStewardId,
        memberUserId: input.memberUserId,
        privacyMode: input.privacyMode ?? "standard",
      },
    );
    if (isPostgresConfigured() && !isSolo) {
      const participants = new Map<string, { relationship: "member" | "case_worker"; accessLevel: "member_safe" | "case_write" }>();
      if (input.memberUserId) participants.set(input.memberUserId, { relationship: "member", accessLevel: "member_safe" });
      if (assignedStewardId) participants.set(assignedStewardId, { relationship: "case_worker", accessLevel: "case_write" });
      if (participants.size) {
        await getDb().insert(grievanceParticipants).values([...participants.entries()].map(([userId, grant]) => ({
          id: randomUUID(), grievanceId: result.grievance.id, userId,
          relationship: grant.relationship, accessLevel: grant.accessLevel,
          addedById: session.user.id,
        })).filter((grant) => grant.relationship !== "member" || grant.userId === input.memberUserId));
      }
    }
    return result;
  });

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.create",
    resourceType: "grievance",
    resourceId: created.grievance.id,
    unionId,
    localId,
  });
  return NextResponse.json(created, { status: 201 });
}
