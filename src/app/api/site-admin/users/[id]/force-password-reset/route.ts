import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import { createPasswordResetToken } from "@/lib/auth/password-reset";
import {
  buildPasswordResetEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * POST /api/site-admin/users/[id]/force-password-reset
 *
 * A platform operator can trigger a password-reset email after fresh MFA.
 * Reset tokens are sent only to the target address and never returned to the
 * operator's browser response.
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
    Object.keys(rawBody).some((key) => key !== "mfaCode")
  ) {
    return respond({ error: "Invalid reset request" }, 400);
  }
  const body = rawBody as { mfaCode?: unknown };
  if (
    body.mfaCode !== undefined &&
    (typeof body.mfaCode !== "string" || body.mfaCode.length > 32)
  ) {
    return respond({ error: "Invalid MFA challenge" }, 400);
  }

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
    unionId?: string,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.user.force_password_reset",
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
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    if (challenge.retryAfterSeconds) {
      headers.set("Retry-After", String(challenge.retryAfterSeconds));
    }
    return NextResponse.json(
      {
        error: "Fresh MFA verification is required before sending a reset email.",
        code: `mfa_step_up_${challenge.code}`,
      },
      {
        status: challenge.status,
        headers: correlation.responseHeaders(headers),
      },
    );
  }

  let target: {
    id: string;
    email: string;
    name: string;
    archivedAt: Date | null;
    unionId: string | null;
  } | undefined;
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        archivedAt: users.archivedAt,
        unionId: users.unionId,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    target = rows[0];
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/users/[id]/force-password-reset");
    await recordOutcome("error", { reason: "target_lookup_failed" }).catch(
      () => undefined,
    );
    return respond({ error: "Password-reset request failed" }, 500);
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
      { error: "User is archived — cannot force reset on archived account" },
      409,
    );
  }

  try {
    await recordOutcome(
      "success",
      { phase: "delivery_authorized" },
      target.unionId ?? undefined,
    );
  } catch {
    return respond(
      {
        error: "The reset email was not sent because the audit record could not be confirmed.",
        code: "audit_unavailable",
      },
      503,
    );
  }

  let emailCopy: ReturnType<typeof buildPasswordResetEmail>;
  try {
    const token = await createPasswordResetToken({
      email: target.email,
      userId: target.id,
    });
    const origin = new URL(req.url).origin;
    const resetUrl = `${emailAppBaseUrl(origin)}/app/reset-password/${token.token}`;
    emailCopy = buildPasswordResetEmail({
      name: target.name,
      resetUrl,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/users/[id]/force-password-reset");
    await recordOutcome(
      "error",
      { phase: "preparation_result", reason: "reset_request_preparation_failed" },
      target.unionId ?? undefined,
    ).catch(() => undefined);
    return respond(
      {
        error: "The password-reset request could not be prepared.",
        code: "reset_request_failed",
      },
      500,
    );
  }

  let emailResult: Awaited<ReturnType<typeof sendTransactionalEmail>>;
  try {
    emailResult = await sendTransactionalEmail({
      to: target.email,
      subject: emailCopy.subject,
      text: emailCopy.text,
    });
  } catch (error) {
    reportApiFailure(error, "/api/site-admin/users/[id]/force-password-reset");
    await recordOutcome(
      "error",
      { phase: "delivery_result", reason: "provider_delivery_unknown" },
      target.unionId ?? undefined,
    ).catch(() => undefined);
    return respond(
      {
        error: "The reset email may have been sent, but its result could not be confirmed. Check before retrying.",
        code: "delivery_result_unconfirmed",
        requestId: correlation.requestId,
      },
      503,
    );
  }

  try {
    await recordOutcome(
      emailResult.ok ? "success" : "error",
      {
        phase: "delivery_result",
        emailSent: String(emailResult.ok),
        ...(emailResult.ok ? {} : { reason: "email_delivery_failed" }),
      },
      target.unionId ?? undefined,
    );
  } catch {
    return respond(
      {
        error: "The reset email may have been sent, but its result could not be confirmed. Check before retrying.",
        code: "delivery_result_unconfirmed",
        requestId: correlation.requestId,
      },
      503,
    );
  }

  if (!emailResult.ok) {
    return respond(
      {
        error: "The password-reset email could not be sent.",
        code: "email_delivery_failed",
        requestId: correlation.requestId,
      },
      502,
    );
  }

  return respond({ ok: true, sent: true, requestId: correlation.requestId });
}
