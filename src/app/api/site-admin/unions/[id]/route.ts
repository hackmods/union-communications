import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { unions } from "@/lib/db/schema/tenant";
import {
  hardDeleteEmptyUnion,
  renameUnion,
} from "@/lib/site-admin/union-lifecycle";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const patchSchema = z
  .object({
    membershipPolicy: z.enum(["multi_local", "single_local"]).optional(),
    name: z.string().min(1).max(200).optional(),
    mfaCode: z.string().max(32).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.membershipPolicy || data.name), {
    message: "Provide name and/or membershipPolicy",
  });

const deleteSchema = z
  .object({
    confirm: z.string().min(1).max(64),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/site-admin/unions/[id]
 *
 * Rename and/or update membership policy (platform_admin).
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
  const parsed = parseJsonBody(patchSchema, raw);
  if (!parsed.ok) {
    return respond(
      { error: "Invalid request body", issues: parsed.issues },
      400,
    );
  }

  const action = parsed.data.name
    ? "site_admin.union.rename"
    : "site_admin.union.membership_policy";

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
    actionOverride = action,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: actionOverride,
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
        error: "Fresh MFA is required before updating this union.",
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
        phase: "update_authorized",
        ...(parsed.data.membershipPolicy
          ? { membershipPolicy: parsed.data.membershipPolicy }
          : {}),
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      });
    } catch {
      return respond(
        {
          error:
            "The union was not updated because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    const response: {
      ok: true;
      name?: string;
      membershipPolicy?: "multi_local" | "single_local";
      multiLocalMemberCount?: number;
    } = { ok: true };

    if (parsed.data.name) {
      mutationStarted = true;
      const renamed = await renameUnion(unionId, parsed.data.name);
      if (!renamed.ok) {
        await recordOutcome("denied", {
          reason: renamed.code ?? "rename_denied",
        }).catch(() => undefined);
        return respond(
          { error: renamed.error, code: renamed.code },
          renamed.status,
        );
      }
      response.name = renamed.data.name;
    }

    if (parsed.data.membershipPolicy) {
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

      response.membershipPolicy = parsed.data.membershipPolicy;
      response.multiLocalMemberCount = multiLocalMemberCount;
    }

    try {
      await recordOutcome("success", {
        phase: "update_result",
        ...(response.name ? { name: response.name } : {}),
        ...(response.membershipPolicy
          ? { membershipPolicy: response.membershipPolicy }
          : {}),
      });
    } catch {
      return respond(
        {
          error:
            "The union may have been updated, but its result audit could not be confirmed. Check the union settings before retrying.",
          code: "union_update_result_unconfirmed",
        },
        503,
      );
    }

    return respond(response);
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/unions/[id]");
    await recordOutcome("error", {
      phase: mutationStarted ? "update_result" : "update_request",
      reason: mutationStarted
        ? "update_outcome_unconfirmed"
        : "update_failed_before_write",
    }).catch(() => undefined);
    if (mutationStarted) {
      return respond(
        {
          error:
            "The union may have been updated, but its result could not be confirmed. Check the union settings before retrying.",
          code: "union_update_result_unconfirmed",
        },
        503,
      );
    }
    return respond({ error: "Update failed" }, 500);
  }
}

/**
 * DELETE /api/site-admin/unions/[id]
 *
 * Hard-delete an archived empty union. Body: `{ confirm: <slug> }`.
 */
export async function DELETE(req: Request, { params }: Params) {
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
  const parsed = parseJsonBody(deleteSchema, raw);
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
      action: "site_admin.union.delete",
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
        error: "Fresh MFA is required before deleting a union.",
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

  try {
    try {
      await recordOutcome("success", { phase: "delete_authorized" });
    } catch {
      return respond(
        {
          error:
            "The union was not deleted because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    const result = await hardDeleteEmptyUnion(
      unionId,
      parsed.data.confirm,
      gate.session.user.id,
    );
    if (!result.ok) {
      await recordOutcome("denied", {
        reason: result.code ?? "delete_denied",
      }).catch(() => undefined);
      return respond(
        { error: result.error, code: result.code },
        result.status,
      );
    }

    try {
      await recordOutcome("success", {
        phase: "delete_result",
        deletedId: result.data.deletedId,
      });
    } catch {
      return respond(
        {
          error:
            "The union may have been deleted, but the result audit could not be confirmed. Reload before retrying.",
          code: "union_delete_result_unconfirmed",
        },
        503,
      );
    }
    return respond({ ok: true, deletedId: result.data.deletedId });
  } catch (error) {
    reportApiFailure(error, "DELETE /api/site-admin/unions/[id]");
    await recordOutcome("error", { reason: "delete_failed" }).catch(
      () => undefined,
    );
    return respond({ error: "Delete failed" }, 500);
  }
}
