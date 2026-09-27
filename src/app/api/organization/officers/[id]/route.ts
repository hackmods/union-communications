import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability, isCrossLocalAdministrator } from "@/lib/authorization/model";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { locals, officerAssignments } from "@/lib/db/schema";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, { ...init, headers: correlation.responseHeaders(headers) });
  };

  if (!isPostgresConfigured()) return respond({ error: "Officer management requires Postgres" }, { status: 503 });
  const session = await auth();
  if (!session?.user?.unionId) return respond({ error: "Unauthorized" }, { status: 401 });
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return respond({ error: "Session expired" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { localId?: string; mfaCode?: unknown };
  if (body.mfaCode !== undefined && (typeof body.mfaCode !== "string" || body.mfaCode.length > 32)) {
    return respond({ error: "Invalid MFA challenge" }, { status: 400 });
  }
  const localId = body.localId ?? session.user.localId;
  if (!localId || !decideCapability(actor, "officers.manage", { unionId: actor.unionId, localId }).allowed) {
    return respond({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const rls = { unionId: session.user.unionId, localId, userId: session.user.id, crossLocal: isCrossLocalAdministrator(actor) };
  const [assignment] = await withRlsContext(rls, () => getDb().select().from(officerAssignments).where(and(
    eq(officerAssignments.id, id), eq(officerAssignments.unionId, session.user.unionId!), eq(officerAssignments.localId, localId),
  )).limit(1));
  if (!assignment) return respond({ error: "Not found" }, { status: 404 });
  const [local] = await withRlsContext(rls, () => getDb().select({ id: locals.id }).from(locals).where(and(eq(locals.id, localId), eq(locals.unionId, session.user.unionId!))).limit(1));
  if (!local) return respond({ error: "Not found" }, { status: 404 });
  if (assignment.revokedAt) return respond({ assignment });
  const recordOutcome = (outcome: "success" | "denied" | "error", reason?: string) => auditLog.log({
    userId: session.user.id!,
    action: "officer.assignment.revoke",
    resourceType: "officer_assignment",
    resourceId: assignment.id,
    unionId: assignment.unionId,
    localId: assignment.localId,
    outcome,
    requestId: correlation.requestId,
    ...(reason ? { metadata: { reason } } : {}),
  });
  const challenge = await verifyFreshMfaStepUp({
    userId: session.user.id!,
    code: typeof body.mfaCode === "string" ? body.mfaCode : undefined,
  });
  if (!challenge.ok) {
    await recordOutcome(challenge.outcome, `mfa_step_up_${challenge.code}`);
    return respond(
      {
        error: challenge.code === "required" ? "A fresh MFA code is required for this authority change." : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      {
        status: challenge.status,
        ...(challenge.retryAfterSeconds
          ? { headers: { "Retry-After": String(challenge.retryAfterSeconds) } }
          : {}),
      },
    );
  }
  const updated = await withRlsContext(rls, () => getDb().transaction(async (tx) => {
    const [row] = await tx.update(officerAssignments).set({ revokedAt: new Date() }).where(eq(officerAssignments.id, assignment.id)).returning();
    await tx.execute(sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${assignment.userId}`);
    await tx.execute(sql`SELECT app_sync_local_portal_membership(${assignment.unionId}, ${assignment.localId}, ${assignment.userId})`);
    return row;
  }));
  await recordOutcome("success");
  return respond({ assignment: updated });
}
