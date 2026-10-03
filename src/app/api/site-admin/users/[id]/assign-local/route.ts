import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  assignUserLocal,
  classifyAssignLocalFailure,
} from "@/lib/tenant/assign-local";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const bodySchema = z.object({
  unionId: z.string().min(1).optional(),
  newUnionName: z.string().min(1).max(200).optional(),
  localId: z.string().min(1).optional(),
  localNumber: z.string().min(1).max(32).optional(),
  localSubText: z.string().max(200).optional(),
  divisionId: z.string().min(1).optional(),
  bargainingUnitId: z.string().nullable().optional(),
  setPrimary: z.boolean().optional(),
  replaceActiveMembership: z.boolean().optional(),
  mfaCode: z.string().max(32).optional(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/site-admin/users/[id]/assign-local
 *
 * Restore or reassign a user's union/local membership after fresh MFA.
 */
export async function POST(req: Request, { params }: Params) {
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
    metadata: Record<string, string>,
    unionId?: string,
    localId?: string,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.user.assign_local",
      resourceType: "site_admin",
      resourceId: targetUserId,
      unionId: unionId ?? gate.session.user.unionId,
      localId: localId ?? gate.session.user.localId,
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    await recordOutcome("denied", { reason: "invalid_json" }).catch(
      () => undefined,
    );
    return respond({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.ok) {
    await recordOutcome("denied", { reason: "invalid_request" }).catch(
      () => undefined,
    );
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
    try {
      await recordOutcome(challenge.outcome, {
        reason: `mfa_step_up_${challenge.code}`,
      });
    } catch {
      return respond(
        { error: "Audit service unavailable", code: "audit_unavailable" },
        { status: 503 },
      );
    }
    return respond(
      {
        error: "A fresh MFA code is required before changing account membership.",
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
    await recordOutcome("success", { phase: "assignment_authorized" });
  } catch {
    return respond(
      {
        error: "The membership change was not applied because its audit record could not be confirmed.",
        code: "audit_unavailable",
      },
      { status: 503 },
    );
  }

  try {
    const result = await assignUserLocal({
      actorUserId: gate.session.user.id,
      targetUserId,
      unionId: parsed.data.unionId,
      newUnionName: parsed.data.newUnionName,
      localId: parsed.data.localId,
      localNumber: parsed.data.localNumber,
      localSubText: parsed.data.localSubText,
      divisionId: parsed.data.divisionId,
      bargainingUnitId: parsed.data.bargainingUnitId,
      setPrimary: parsed.data.setPrimary ?? true,
      replaceActiveMembership: parsed.data.replaceActiveMembership,
    });
    if (!result.ok) {
      await recordOutcome(
        "denied",
        {
          phase: "assignment_result",
          reason: result.code ?? "assignment_rejected",
        },
      ).catch(() => undefined);
      return respond(
        {
          error: result.error,
          code: result.code,
          conflictingLocalIds: result.conflictingLocalIds,
        },
        { status: result.status },
      );
    }

    try {
      await recordOutcome(
        "success",
        {
          phase: "assignment_result",
          membershipId: result.membershipId,
          createdLocal: String(result.createdLocal),
          createdUnion: String(result.createdUnion),
          replaced: String(result.replacedMembershipIds.length),
        },
        result.unionId,
        result.localId,
      );
    } catch {
      return respond(
        {
          error: "Membership was changed, but the result audit could not be confirmed. Check the account before retrying.",
          code: "assignment_audit_unavailable",
        },
        { status: 503 },
      );
    }

    return respond({ ...result });
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/users/[id]/assign-local");
    const classified = classifyAssignLocalFailure(error);
    if (classified && !classified.ok) {
      await recordOutcome(
        "denied",
        {
          phase: "assignment_result",
          reason: classified.code ?? "assignment_rejected",
        },
      ).catch(() => undefined);
      return respond(
        {
          error: classified.error,
          code: classified.code,
        },
        { status: classified.status },
      );
    }
    await recordOutcome(
      "error",
      { phase: "assignment_result", reason: "assignment_failed" },
    ).catch(() => undefined);
    return respond(
      {
        error: "Assign local failed",
        code: "assignment_failed",
      },
      { status: 500 },
    );
  }
}
