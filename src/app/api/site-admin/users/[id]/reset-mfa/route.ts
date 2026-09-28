import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { clearTotpEnrollmentForUser } from "@/lib/auth/mfa-user-secret";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * POST /api/site-admin/users/[id]/reset-mfa
 *
 * Platform operator clears authenticator enrollment after typed email confirm
 * + fresh MFA. Target must re-enroll; recovery codes are invalidated.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  if (!id) return respond({ error: "Missing user id" }, 400);

  const rawBody = await req.json().catch(() => null);
  if (
    !rawBody ||
    typeof rawBody !== "object" ||
    Array.isArray(rawBody) ||
    Object.keys(rawBody).some((key) => key !== "mfaCode" && key !== "confirmEmail")
  ) {
    return respond({ error: "Invalid reset request" }, 400);
  }
  const body = rawBody as { mfaCode?: unknown; confirmEmail?: unknown };
  if (
    body.mfaCode !== undefined &&
    (typeof body.mfaCode !== "string" || body.mfaCode.length > 32)
  ) {
    return respond({ error: "Invalid MFA challenge" }, 400);
  }
  if (typeof body.confirmEmail !== "string" || !body.confirmEmail.trim()) {
    return respond(
      {
        error: "Target email confirmation is required",
        code: "confirm_email_required",
      },
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
      action: "site_admin.user.reset_mfa",
      resourceType: "site_admin",
      resourceId: id,
      unionId,
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  let target:
    | {
        id: string;
        email: string;
        archivedAt: Date | null;
        unionId: string | null;
        totpSecret: string | null;
        mfaEnabled: boolean;
      }
    | undefined;
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        archivedAt: users.archivedAt,
        unionId: users.unionId,
        totpSecret: users.totpSecret,
        mfaEnabled: users.mfaEnabled,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    target = rows[0];
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/users/[id]/reset-mfa");
    await recordOutcome("error", { reason: "target_lookup_failed" }).catch(
      () => undefined,
    );
    return respond({ error: "MFA reset request failed" }, 500);
  }

  if (!target) {
    await recordOutcome("denied", { reason: "target_not_found" }).catch(
      () => undefined,
    );
    return respond({ error: "User not found" }, 404);
  }
  if (target.archivedAt) {
    await recordOutcome(
      "denied",
      { reason: "target_archived" },
      target.unionId ?? undefined,
    ).catch(() => undefined);
    return respond(
      { error: "User is archived — cannot reset MFA on archived account" },
      409,
    );
  }

  const confirm = body.confirmEmail.trim().toLowerCase();
  if (confirm !== target.email.trim().toLowerCase()) {
    await recordOutcome(
      "denied",
      { reason: "confirm_email_mismatch" },
      target.unionId ?? undefined,
    ).catch(() => undefined);
    return respond(
      {
        error: "Confirmation email does not match this account.",
        code: "confirm_email_mismatch",
      },
      400,
    );
  }

  const enrolled = target.mfaEnabled || Boolean(target.totpSecret);
  if (!enrolled) {
    await recordOutcome(
      "denied",
      { reason: "not_enrolled" },
      target.unionId ?? undefined,
    ).catch(() => undefined);
    return respond(
      {
        error: "Authenticator is not enrolled for this account.",
        code: "not_enrolled",
      },
      409,
    );
  }

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
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    if (challenge.retryAfterSeconds) {
      headers.set("Retry-After", String(challenge.retryAfterSeconds));
    }
    return NextResponse.json(
      {
        error: "Fresh MFA verification is required before resetting MFA.",
        code: `mfa_step_up_${challenge.code}`,
      },
      {
        status: challenge.status,
        headers: correlation.responseHeaders(headers),
      },
    );
  }

  try {
    await clearTotpEnrollmentForUser(target.id);
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/users/[id]/reset-mfa");
    await recordOutcome(
      "error",
      { reason: "clear_failed" },
      target.unionId ?? undefined,
    ).catch(() => undefined);
    return respond({ error: "Could not reset authenticator enrollment." }, 500);
  }

  try {
    await recordOutcome(
      "success",
      { phase: "reset_complete" },
      target.unionId ?? undefined,
    );
  } catch {
    return respond(
      {
        error:
          "Authenticator may have been cleared, but the audit record could not be confirmed.",
        code: "audit_unavailable",
      },
      503,
    );
  }

  return respond({ ok: true, requestId: correlation.requestId });
}
