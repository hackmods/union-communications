import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { unions } from "@/lib/db/schema/tenant";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const bodySchema = z
  .object({
    membershipPolicy: z.enum(["multi_local", "single_local"]),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/site-admin/unions/[id]
 *
 * Update union membership policy (platform_admin). When switching to
 * single_local, returns a count of members who still have multiple active
 * locals so the UI can warn the operator.
 */
export async function PATCH(req: Request, { params }: Params) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders({
        "Cache-Control": "private, no-store",
      }),
    });

  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return respond({ error: gate.error }, gate.status);
  }
  if (!isPostgresConfigured()) {
    return respond({ error: "Postgres is not configured" }, 503);
  }

  const { id: unionId } = await params;
  if (!unionId) return respond({ error: "Missing union id" }, 400);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }
  const parsed = parseJsonBody(bodySchema, raw);
  if (!parsed.ok) {
    return respond(
      { error: "Invalid request body", issues: parsed.issues },
      400,
    );
  }

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.union.membership_policy",
      resourceType: "site_admin",
      resourceId: unionId,
      unionId,
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
    return NextResponse.json(
      {
        error: "Fresh MFA is required before changing membership policy.",
        code: `mfa_step_up_${challenge.code}`,
      },
      {
        status: challenge.status,
        headers: correlation.responseHeaders({
          "Cache-Control": "private, no-store",
          ...Object.fromEntries(headers.entries()),
        }),
      },
    );
  }

  let mutationStarted = false;
  try {
    const db = getDb();
    const [union] = await db
      .select({ id: unions.id })
      .from(unions)
      .where(eq(unions.id, unionId))
      .limit(1);
    if (!union) {
      await recordOutcome("denied", { reason: "union_not_found" }).catch(
        () => undefined,
      );
      return respond({ error: "Union not found" }, 404);
    }

    try {
      await recordOutcome("success", {
        phase: "policy_change_authorized",
        membershipPolicy: parsed.data.membershipPolicy,
      });
    } catch {
      return respond(
        {
          error:
            "The membership policy was not changed because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    let multiLocalMemberCount = 0;
    if (parsed.data.membershipPolicy === "single_local") {
      const result = await db.execute(sql`
        SELECT count(*)::int AS n FROM (
          SELECT user_id
          FROM local_memberships
          WHERE union_id = ${unionId}
            AND status = 'active'
            AND ended_at IS NULL
          GROUP BY user_id
          HAVING count(*) > 1
        ) AS multi
      `);
      // postgres-js RowList is Array-like but not assignable to { n }[] directly.
      const rows = (
        Array.isArray(result)
          ? result
          : ((result as { rows?: unknown }).rows ?? [])
      ) as unknown as Array<{ n: number }>;
      multiLocalMemberCount = Number(rows[0]?.n ?? 0);
    }

    mutationStarted = true;
    await db
      .update(unions)
      .set({ membershipPolicy: parsed.data.membershipPolicy })
      .where(eq(unions.id, unionId));

    try {
      await recordOutcome("success", {
        phase: "policy_change_result",
        membershipPolicy: parsed.data.membershipPolicy,
      });
    } catch {
      return respond(
        {
          error:
            "The policy may have changed, but its result audit could not be confirmed. Check the union settings before retrying.",
          code: "membership_policy_result_unconfirmed",
        },
        503,
      );
    }

    return respond({
      ok: true,
      membershipPolicy: parsed.data.membershipPolicy,
      multiLocalMemberCount,
    });
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/unions/[id]");
    await recordOutcome("error", {
      phase: mutationStarted
        ? "policy_change_result"
        : "policy_change_request",
      reason: mutationStarted
        ? "policy_update_outcome_unconfirmed"
        : "policy_update_failed_before_write",
    }).catch(() => undefined);
    if (mutationStarted) {
      return respond(
        {
          error:
            "The policy may have changed, but its result could not be confirmed. Check the union settings before retrying.",
          code: "membership_policy_result_unconfirmed",
        },
        503,
      );
    }
    return respond({ error: "Update failed" }, 500);
  }
}
