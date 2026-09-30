import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { issueMfaGrant } from "@/lib/auth/mfa-grants";
import { classifySubmittedMfaCode } from "@/lib/auth/mfa-client-codes";
import { resolveMfaMode, verifyMfaCode } from "@/lib/auth/mfa-policy";
import { consumeMfaRecoveryCode } from "@/lib/auth/mfa-recovery-codes";
import { reserveMfaVerificationAttempt } from "@/lib/auth/mfa-attempt-limits";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";

/**
 * MFA verify — validates the code server-side, then issues a single-use
 * grant nonce. The client must pass that nonce through session.update({ mfaGrant })
 * so the JWT callback can set mfaVerified (SEC-001). Never trust a client boolean.
 */
export async function POST(request: Request) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, init: ResponseInit = {}) =>
    NextResponse.json(body, {
      ...init,
      headers: correlation.responseHeaders(init.headers),
    });
  const session = await auth();
  if (!session?.user) {
    return respond({ error: "Unauthorized" }, { status: 401 });
  }

  const recordOutcome = (action: string, outcome: "success" | "denied" | "error") =>
    auditLog.log({
      userId: session.user.id,
      action,
      resourceType: "session",
      resourceId: session.user.id,
      unionId: session.user.unionId,
      localId: session.user.localId,
      outcome,
      requestId: correlation.requestId,
    });

  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    await recordOutcome("auth.mfa_verify_failed", "denied");
    return respond(
      { error: "Invalid code", code: "invalid" },
      { status: 400 },
    );
  }

  const code = body.code ?? "";
  const submitted = classifySubmittedMfaCode(code);
  if (submitted === "empty") {
    await recordOutcome("auth.mfa_verify_failed", "denied");
    return respond(
      { error: "Enter a verification code.", code: "empty" },
      { status: 400 },
    );
  }
  if (submitted === "invalid") {
    await recordOutcome("auth.mfa_verify_failed", "denied");
    return respond(
      { error: "Invalid code", code: "invalid" },
      { status: 400 },
    );
  }
  const recoveryAttempt = resolveMfaMode() === "totp" && submitted === "recovery";
  let attemptAlreadyReserved = false;
  if (recoveryAttempt) {
    try {
      const attempt = await reserveMfaVerificationAttempt(session.user.id);
      if (!attempt.allowed) {
        await recordOutcome("auth.mfa_verify_failed", "denied");
        return respond(
          {
            error: "Too many verification attempts. Try again after the limit resets.",
            code: "limited",
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(attempt.retryAfterSeconds),
              "Cache-Control": "private, no-store",
            },
          },
        );
      }
      attemptAlreadyReserved = true;
    } catch (error) {
      console.error("[auth] MFA verify attempt reserve failed", {
        userId: session.user.id,
        message: error instanceof Error ? error.message : String(error),
      });
      await recordOutcome("auth.mfa_verify_unavailable", "error");
      return respond(
        {
          error: "MFA verification safeguards are unavailable.",
          code: "storage_unavailable",
        },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  }
  const recoveryUsed = recoveryAttempt && (await consumeMfaRecoveryCode(session.user.id, code));
  const result = recoveryUsed
    ? ({ ok: true, mode: "totp" } as const)
    : await verifyMfaCode({
        userId: session.user.id,
        code,
        attemptAlreadyReserved,
      });

  if (!result.ok) {
    await recordOutcome(
      result.status === 503 ? "auth.mfa_verify_unavailable" : "auth.mfa_verify_failed",
      result.status === 503 ? "error" : "denied",
    );
    const needsEnrollment = result.code === "not_enrolled";
    return respond(
      {
        error: result.error,
        code: result.code,
        ...(needsEnrollment ? { needsEnrollment: true } : {}),
      },
      {
        status: result.status,
        ...(result.status === 429
          ? {
              headers: {
                "Retry-After": String(result.retryAfterSeconds ?? 900),
                "Cache-Control": "private, no-store",
              },
            }
          : {}),
      },
    );
  }

  let mfaGrant: string;
  try {
    mfaGrant = await issueMfaGrant(
      session.user.id,
      Date.now(),
      session.user.sessionVersion ?? 0,
    );
  } catch (error) {
    console.error("[auth] MFA grant issue failed", {
      userId: session.user.id,
      message: error instanceof Error ? error.message : String(error),
    });
    await recordOutcome("auth.mfa_verify_unavailable", "error");
    return respond(
      {
        error: "Could not create a secure session grant. Try again shortly.",
        code: "storage_unavailable",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  await recordOutcome(
    recoveryUsed ? "auth.mfa_recovery_code_use" : "auth.mfa_verify",
    "success",
  );

  return respond({ success: true, mfaGrant });
}
