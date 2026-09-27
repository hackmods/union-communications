import { NextResponse } from "next/server";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { archiveUnion } from "@/lib/site-admin/union-lifecycle";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * POST /api/site-admin/unions/[id]/archive
 *
 * Soft-archive a union: set archived_at, drop from runtime overlay.
 */
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
  const { id } = await params;
  if (!id) return respond({ error: "Missing union id" }, 400);

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

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.union.archive",
      resourceType: "site_admin",
      resourceId: id,
      unionId: id,
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
        error: "Fresh MFA is required before archiving a union.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  try {
    try {
      await recordOutcome("success", { phase: "archive_authorized" });
    } catch {
      return respond(
        {
          error:
            "The union was not archived because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    const result = await archiveUnion(id, gate.session.user.id);
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
        archivedAt: result.data.archivedAt,
      });
    } catch {
      return respond(
        {
          error:
            "The union may have been archived, but the result audit could not be confirmed. Check its status before retrying.",
          code: "union_action_audit_unavailable",
        },
        503,
      );
    }
    return respond({ ok: true, archivedAt: result.data.archivedAt });
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/unions/[id]/archive");
    await recordOutcome("error", { reason: "archive_failed" }).catch(
      () => undefined,
    );
    return respond({ error: "Archive failed" }, 500);
  }
}
