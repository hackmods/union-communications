import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { divisions, unions } from "@/lib/db/schema/tenant";
import { createDivisionDurable } from "@/lib/tenant/persist";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import type { HubModule } from "@/types/tenant";

const createSchema = z
  .object({
    unionId: z.string().min(1).max(64),
    code: z.string().min(1).max(64),
    name: z.string().min(1).max(200),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

/**
 * POST /api/site-admin/collectives — create a bargaining collective (Division).
 */
export async function POST(req: Request) {
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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }
  const parsed = parseJsonBody(createSchema, raw);
  if (!parsed.ok) {
    return respond(
      { error: "Invalid request body", issues: parsed.issues },
      400,
    );
  }

  const { unionId, code, name } = parsed.data;
  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.collective.create",
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
    return respond(
      {
        error: "Fresh MFA is required before creating a bargaining collective.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  let mutationStarted = false;
  try {
    const db = getDb();
    const [unionRow] = await db
      .select({
        id: unions.id,
        enabledModules: unions.enabledModules,
      })
      .from(unions)
      .where(eq(unions.id, unionId))
      .limit(1);
    if (!unionRow) {
      await recordOutcome("denied", { reason: "union_not_found" }).catch(
        () => undefined,
      );
      return respond({ error: "Union not found" }, 404);
    }

    const normalized = code.trim().toLowerCase();
    const [codeClash] = await db
      .select({ id: divisions.id })
      .from(divisions)
      .where(
        and(
          eq(divisions.unionId, unionId),
          sql`lower(${divisions.code}) = lower(${normalized})`,
          isNull(divisions.archivedAt),
        ),
      )
      .limit(1);
    if (codeClash) {
      await recordOutcome("denied", { reason: "code_taken" }).catch(
        () => undefined,
      );
      return respond(
        {
          error: "Bargaining collective code already exists",
          code: "code_taken",
        },
        409,
      );
    }

    try {
      await recordOutcome("success", {
        phase: "create_authorized",
        code: normalized,
      });
    } catch {
      return respond(
        {
          error:
            "The collective was not created because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    mutationStarted = true;
    const collective = await createDivisionDurable({
      unionId,
      code: normalized,
      name: name.trim(),
      enabledModules: (unionRow.enabledModules ?? []) as HubModule[],
    });

    try {
      await recordOutcome("success", {
        phase: "create_result",
        collectiveId: collective.id,
      });
    } catch {
      return respond(
        {
          error:
            "The collective may have been created, but the result audit could not be confirmed. Reload before retrying.",
          code: "collective_create_result_unconfirmed",
        },
        503,
      );
    }
    return respond({ ok: true, collective }, 201);
  } catch (error) {
    reportApiFailure(error, "POST /api/site-admin/collectives");
    await recordOutcome("error", {
      reason: mutationStarted
        ? "create_outcome_unconfirmed"
        : "create_failed",
    }).catch(() => undefined);
    if (mutationStarted) {
      return respond(
        {
          error:
            "The collective may have been created, but its result could not be confirmed. Reload before retrying.",
          code: "collective_create_result_unconfirmed",
        },
        503,
      );
    }
    return respond({ error: "Create failed" }, 500);
  }
}
