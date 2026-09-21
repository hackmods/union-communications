import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isMfaEnabled, sessionMfaOk } from "@/lib/auth/mfa-policy";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { auditLog } from "@/lib/audit/store";
import { grievanceStore } from "@/lib/grievance/store";
import { grievanceDbBackend } from "@/lib/db/backend";

type Params = { params: Promise<{ id: string }> };

async function resolveAdmin() {
  const session = await auth();
  if (!session?.user?.unionId) return { error: "Unauthorized", status: 401 as const };
  if (!isMfaEnabled() || !sessionMfaOk(session)) {
    return { error: "Verified MFA on this host is required for break-glass access", status: 403 as const };
  }
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return { error: "Session expired", status: 401 as const };
  if (!actor.roles.includes("platform_admin") || !actor.mfaVerified) {
    return { error: "Platform administrator MFA is required", status: 403 as const };
  }
  if (!isPostgresConfigured() || actor.source !== "database" || grievanceDbBackend() !== "postgres") {
    return { error: "Break-glass access requires the durable authorization backend", status: 503 as const };
  }
  return { session, actor, rls: rlsContextForActor(session, actor) ?? {} };
}

export async function POST(request: Request, { params }: Params) {
  const access = await resolveAdmin();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { reason?: string } | null;
  const reason = body?.reason?.trim();
  if (!reason || reason.length < 20 || reason.length > 2000) {
    return NextResponse.json({ error: "Provide a written reason of 20 to 2,000 characters" }, { status: 400 });
  }
  const grants = await withRlsContext(access.rls, () => getDb().execute(
    // The security-definer function can inspect only this exact case ID and
    // insert only a 30-minute grant after checking actor, MFA, and reason.
    sql`SELECT * FROM app_create_break_glass_grant(${id}, ${reason})`,
  ));
  const grant = grants[0] as { grant_id: string; union_id: string; local_id: string; expires_at: Date } | undefined;
  if (!grant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await withRlsContext(access.rls, () => auditLog.log({
    userId: access.session.user.id,
    action: "grievance.break_glass.grant",
    resourceType: "grievance",
    resourceId: id,
    unionId: grant.union_id,
    localId: grant.local_id,
    metadata: { reason, grantId: grant.grant_id, expiresAt: grant.expires_at.toISOString() },
  }));
  return NextResponse.json({ grantId: grant.grant_id, expiresAt: grant.expires_at.toISOString() }, { status: 201 });
}

export async function DELETE(_request: Request, { params }: Params) {
  const access = await resolveAdmin();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const data = await withRlsContext(access.rls, () => grievanceStore.getById(id));
  if (!data || data.grievance.unionId !== access.session.user.unionId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const result = await withRlsContext(access.rls, () => getDb().execute(
    sql`SELECT app_revoke_break_glass_grant(${id}) AS grant_id`,
  ));
  const grantId = result[0]?.grant_id;
  if (typeof grantId !== "string") return NextResponse.json({ error: "Not found" }, { status: 404 });
  await withRlsContext(access.rls, () => auditLog.log({
    userId: access.session.user.id,
    action: "grievance.break_glass.revoke",
    resourceType: "grievance",
    resourceId: id,
    unionId: data.grievance.unionId,
    localId: data.grievance.localId,
    metadata: { grantId },
  }));
  return NextResponse.json({ ok: true });
}
