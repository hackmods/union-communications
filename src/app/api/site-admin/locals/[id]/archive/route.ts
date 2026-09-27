import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { locals } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/** POST /api/site-admin/locals/[id]/archive — soft-archive a local. */
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
  if (!id) return respond({ error: "Missing local id" }, 400);

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
    unionId?: string,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.local.archive",
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
        error: "Fresh MFA is required before archiving a local.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  let mutationStarted = false;
  let targetUnionId: string | undefined;
  try {
    const db = getDb();
    const existing = await db
      .select({
        id: locals.id,
        unionId: locals.unionId,
      })
      .from(locals)
      .where(eq(locals.id, id))
      .limit(1);
    if (!existing[0]) {
      await recordOutcome("denied", { reason: "local_not_found" }).catch(
        () => undefined,
      );
      return respond({ error: "Local not found" }, 404);
    }
    targetUnionId = existing[0].unionId ?? undefined;

    try {
      await recordOutcome(
        "success",
        { phase: "archive_authorized" },
        existing[0].unionId ?? undefined,
      );
    } catch {
      return respond(
        {
          error:
            "The local was not archived because its audit record could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    mutationStarted = true;
    await db
      .update(locals)
      .set({ archivedAt: new Date(), archivedById: gate.session.user.id })
      .where(eq(locals.id, id));

    try {
      await recordOutcome(
        "success",
        { phase: "archive_result", localId: id },
        existing[0].unionId ?? undefined,
      );
    } catch {
      return respond(
        {
          error: "The local may have been archived, but the result audit could not be confirmed. Check its status before retrying.",
          code: "local_action_audit_unavailable",
        },
        503,
      );
    }
    return respond({ ok: true });
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/locals/[id]/archive");
    await recordOutcome(
      "error",
      {
        reason: mutationStarted
          ? "archive_outcome_unconfirmed"
          : "archive_failed",
      },
      targetUnionId,
    ).catch(() => undefined);
    if (mutationStarted) {
      return respond(
        {
          error:
            "The local may have been archived, but the result could not be confirmed. Check its status before retrying.",
          code: "local_action_outcome_unconfirmed",
        },
        503,
      );
    }
    return respond({ error: "Archive failed" }, 500);
  }
}
