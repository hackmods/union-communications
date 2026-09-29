import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { divisions } from "@/lib/db/schema/tenant";
import { archiveCollective } from "@/lib/site-admin/collective-lifecycle";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/** POST /api/site-admin/collectives/[id]/archive */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  if (!id) return respond({ error: "Missing collective id" }, 400);

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return respond({ error: "Invalid archive request" }, 400);
  }
  const body = raw as { mfaCode?: unknown };
  if (
    Object.keys(body).some((key) => key !== "mfaCode") ||
    (body.mfaCode !== undefined &&
      (typeof body.mfaCode !== "string" || body.mfaCode.length > 32))
  ) {
    return respond({ error: "Invalid archive request" }, 400);
  }

  let unionId: string | undefined;
  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.collective.archive",
      resourceType: "site_admin",
      resourceId: id,
      unionId,
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  const challenge = await verifyFreshMfaStepUp({
    userId: gate.session.user.id,
    code: typeof body.mfaCode === "string" ? body.mfaCode : undefined,
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
        error: "Fresh MFA is required before archiving a bargaining collective.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  let mutationStarted = false;
  try {
    const db = getDb();
    const [existing] = await db
      .select({ id: divisions.id, unionId: divisions.unionId })
      .from(divisions)
      .where(eq(divisions.id, id))
      .limit(1);
    if (!existing) {
      await recordOutcome("denied", { reason: "collective_not_found" }).catch(
        () => undefined,
      );
      return respond({ error: "Collective not found" }, 404);
    }
    unionId = existing.unionId;

    try {
      await recordOutcome("success", { phase: "archive_authorized" });
    } catch {
      return respond(
        {
          error:
            "The collective was not archived because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    mutationStarted = true;
    const result = await archiveCollective(id, gate.session.user.id);
    if (!result.ok) {
      await recordOutcome("denied", {
        reason: result.code ?? "archive_denied",
      }).catch(() => undefined);
      return respond(
        { error: result.error, code: result.code },
        result.status,
      );
    }

    try {
      await recordOutcome("success", {
        phase: "archive_result",
        collectiveId: id,
      });
    } catch {
      return respond(
        {
          error:
            "The collective may have been archived, but the result audit could not be confirmed. Check its status before retrying.",
          code: "collective_action_audit_unavailable",
        },
        503,
      );
    }
    return respond({ ok: true, archivedAt: result.data.archivedAt });
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/collectives/[id]/archive");
    await recordOutcome("error", {
      reason: mutationStarted
        ? "archive_outcome_unconfirmed"
        : "archive_failed",
    }).catch(() => undefined);
    if (mutationStarted) {
      return respond(
        {
          error:
            "The collective may have been archived, but the result could not be confirmed. Check its status before retrying.",
          code: "collective_action_outcome_unconfirmed",
        },
        503,
      );
    }
    return respond({ error: "Archive failed" }, 500);
  }
}
