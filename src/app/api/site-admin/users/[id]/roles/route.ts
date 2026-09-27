import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { setUserRoles } from "@/lib/site-admin/set-user-roles";
import { parseJsonBody } from "@/lib/validation/parse";
import { userRoleSchema } from "@/lib/validation/tenant";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const bodySchema = z.object({
  roles: z.array(userRoleSchema).min(1).max(12),
  mfaCode: z.string().max(32).optional(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/site-admin/users/[id]/roles
 *
 * Replace Hub roles for a user (platform_admin). Bumps sessionVersion.
 */
export async function PATCH(req: Request, { params }: Params) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, {
      ...init,
      headers: correlation.responseHeaders(headers),
    });
  };

  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return respond({ error: gate.error }, { status: gate.status });
  }
  if (!isPostgresConfigured()) {
    return respond(
      { error: "Postgres is not configured" },
      { status: 503 },
    );
  }

  const { id: targetUserId } = await params;
  if (!targetUserId) {
    return respond({ error: "Missing user id" }, { status: 400 });
  }

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata?: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.user.set_roles",
      resourceType: "site_admin",
      resourceId: targetUserId,
      unionId: gate.session.user.unionId,
      localId: gate.session.user.localId,
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    await recordOutcome("denied", { reason: "invalid_json" });
    return respond({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.ok) {
    await recordOutcome("denied", { reason: "invalid_request" });
    return respond(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const challenge = await verifyFreshMfaStepUp({
    userId: gate.session.user.id,
    code: parsed.data.mfaCode,
  });
  if (!challenge.ok) {
    await recordOutcome(challenge.outcome, { reason: `mfa_step_up_${challenge.code}` });
    return respond(
      {
        error:
          challenge.code === "required"
            ? "A fresh MFA code is required for this role change."
            : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      {
        status: challenge.status,
        ...(challenge.retryAfterSeconds
          ? {
              headers: {
                "Retry-After": String(challenge.retryAfterSeconds),
              },
            }
          : {}),
      },
    );
  }

  try {
    const result = await setUserRoles({
      actorUserId: gate.session.user.id!,
      targetUserId,
      roles: parsed.data.roles,
    });
    if (!result.ok) {
      await recordOutcome("denied", {
        reason: result.code ?? "role_change_rejected",
      });
      return respond(
        { error: result.error, code: result.code },
        { status: result.status },
      );
    }

    await recordOutcome("success", {
      roles: result.roles.join(","),
      sessionVersion: String(result.sessionVersion),
    });

    return respond({
      roles: result.roles,
      sessionVersion: result.sessionVersion,
    });
  } catch (error) {
    reportApiFailure(error, "PATCH /api/site-admin/users/[id]/roles");
    await recordOutcome("error", { reason: "role_change_error" }).catch(
      () => undefined,
    );
    return respond(
      { error: "Could not update roles" },
      { status: 500 },
    );
  }
}
