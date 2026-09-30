import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { isOwnerDbConfigured } from "@/lib/db/owner-client";
import { executeLocalMove } from "@/lib/site-admin/local-move";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const moveSchema = z
  .object({
    toUnionId: z.string().min(1).max(64),
    toDivisionId: z.union([z.string().min(1).max(64), z.null()]).optional(),
    localNumber: z.string().min(1).max(32).optional(),
    confirmLocalNumber: z.string().min(1).max(32),
    acknowledgeWarnings: z.boolean(),
    endOtherMembershipsInDestination: z.boolean().optional(),
    allowDemoMismatch: z.boolean().optional(),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/site-admin/locals/[id]/move
 *
 * In-place reparent: keep local id, rewrite union_id across dual-key tables.
 */
export async function POST(req: Request, { params }: Params) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200, extra?: HeadersInit) => {
    const headers = new Headers(extra);
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders(headers),
    });
  };

  const gate = await requireSiteAdminSession();
  if (!gate.ok) return respond({ error: gate.error }, gate.status);
  if (!isPostgresConfigured()) {
    return respond({ error: "Postgres is not configured" }, 503);
  }
  if (!isOwnerDbConfigured()) {
    return respond(
      {
        error:
          "Owner database URL is required to move a local across unions (MIGRATE_DATABASE_URL).",
        code: "owner_db_required",
      },
      503,
    );
  }

  const { id: localId } = await params;
  if (!localId) return respond({ error: "Missing local id" }, 400);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }
  const parsed = parseJsonBody(moveSchema, raw);
  if (!parsed.ok) {
    return respond(
      { error: "Invalid request body", issues: parsed.issues },
      400,
    );
  }

  let fromUnionId: string | undefined;
  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.local.move",
      resourceType: "site_admin",
      resourceId: localId,
      unionId: fromUnionId,
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

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
        503,
      );
    }
    const headers = new Headers();
    if (challenge.retryAfterSeconds) {
      headers.set("Retry-After", String(challenge.retryAfterSeconds));
    }
    return respond(
      {
        error: "Fresh MFA is required before moving a local.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  let mutationStarted = false;
  try {
    try {
      await recordOutcome("success", {
        phase: "move_authorized",
        toUnionId: parsed.data.toUnionId,
      });
    } catch {
      return respond(
        {
          error:
            "The local was not moved because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    mutationStarted = true;
    const result = await executeLocalMove({
      localId,
      toUnionId: parsed.data.toUnionId,
      toDivisionId: parsed.data.toDivisionId,
      localNumber: parsed.data.localNumber,
      confirmLocalNumber: parsed.data.confirmLocalNumber,
      acknowledgeWarnings: parsed.data.acknowledgeWarnings,
      endOtherMembershipsInDestination:
        parsed.data.endOtherMembershipsInDestination,
      allowDemoMismatch: parsed.data.allowDemoMismatch,
      actorUserId: gate.session.user.id,
    });

    if (!result.ok) {
      fromUnionId = undefined;
      await recordOutcome("denied", {
        reason: result.code ?? "move_denied",
        toUnionId: parsed.data.toUnionId,
      }).catch(() => undefined);
      return respond(
        { error: result.error, code: result.code },
        result.status,
      );
    }

    fromUnionId = result.data.fromUnionId;
    try {
      await recordOutcome("success", {
        phase: "move_result",
        fromUnionId: result.data.fromUnionId,
        toUnionId: result.data.toUnionId,
        tablesTouched: String(result.data.tablesTouched),
        usersBumped: String(result.data.usersBumped),
        invitesRewritten: String(result.data.invitesRewritten),
        caseworkRows: String(result.data.caseworkRows),
        localNumber: result.data.localNumber,
      });
    } catch {
      return respond(
        {
          error:
            "The local may have been moved, but the result audit could not be confirmed. Reload before retrying.",
          code: "local_move_result_unconfirmed",
        },
        503,
      );
    }

    return respond({ ok: true, move: result.data });
  } catch (error) {
    reportApiFailure(error, "POST /api/site-admin/locals/[id]/move");
    await recordOutcome("error", {
      reason: mutationStarted ? "move_outcome_unconfirmed" : "move_failed",
    }).catch(() => undefined);
    if (mutationStarted) {
      return respond(
        {
          error:
            "The local may have been moved, but its result could not be confirmed. Check the local before retrying.",
          code: "local_move_result_unconfirmed",
        },
        503,
      );
    }
    return respond({ error: "Move failed" }, 500);
  }
}
