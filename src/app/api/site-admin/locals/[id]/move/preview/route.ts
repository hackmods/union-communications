import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { isOwnerDbConfigured } from "@/lib/db/owner-client";
import { previewLocalMove } from "@/lib/site-admin/local-move";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const previewSchema = z
  .object({
    toUnionId: z.string().min(1).max(64),
    toDivisionId: z.union([z.string().min(1).max(64), z.null()]).optional(),
    localNumber: z.string().min(1).max(32).optional(),
    endOtherMembershipsInDestination: z.boolean().optional(),
    allowDemoMismatch: z.boolean().optional(),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/site-admin/locals/[id]/move/preview
 *
 * Site Admin session required. Returns impact counts, hard blocks, and
 * warnings. Fresh MFA is required only on the commit route.
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
    return respond(
      { error: "Postgres is not configured", code: "postgres_required" },
      503,
    );
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
  const parsed = parseJsonBody(previewSchema, raw);
  if (!parsed.ok) {
    return respond(
      { error: "Invalid request body", issues: parsed.issues },
      400,
    );
  }

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
    unionId?: string,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.local.move_preview",
      resourceType: "site_admin",
      resourceId: localId,
      unionId,
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  try {
    try {
      await recordOutcome("success", {
        phase: "preview_authorized",
        toUnionId: parsed.data.toUnionId,
      });
    } catch {
      return respond(
        {
          error:
            "The preview was not run because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    const result = await previewLocalMove({
      localId,
      toUnionId: parsed.data.toUnionId,
      toDivisionId: parsed.data.toDivisionId,
      localNumber: parsed.data.localNumber,
      endOtherMembershipsInDestination:
        parsed.data.endOtherMembershipsInDestination,
      allowDemoMismatch: parsed.data.allowDemoMismatch,
    });
    if (!result.ok) {
      await recordOutcome("denied", {
        reason: result.code ?? "preview_denied",
        toUnionId: parsed.data.toUnionId,
      }).catch(() => undefined);
      return respond(
        { error: result.error, code: result.code },
        result.status,
      );
    }

    try {
      await recordOutcome(
        "success",
        {
          phase: "preview_result",
          fromUnionId: result.data.fromUnionId,
          toUnionId: result.data.toUnionId,
          canMove: result.data.canMove ? "true" : "false",
          blockCount: String(result.data.blocks.length),
          warningCount: String(result.data.warnings.length),
        },
        result.data.fromUnionId,
      );
    } catch {
      return respond(
        {
          error:
            "The preview may have completed, but the result audit could not be confirmed. Reload before retrying.",
          code: "local_move_result_unconfirmed",
        },
        503,
      );
    }

    return respond({ ok: true, preview: result.data });
  } catch (error) {
    reportApiFailure(error, "POST /api/site-admin/locals/[id]/move/preview");
    await recordOutcome("error", { reason: "preview_failed" }).catch(
      () => undefined,
    );
    return respond({ error: "Preview failed" }, 500);
  }
}
