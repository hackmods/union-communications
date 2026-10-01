import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { assertNoPendingMfaGrant, issueMfaGrant, MfaGrantPendingError } from "@/lib/auth/mfa-grants";
import { classifySubmittedMfaCode } from "@/lib/auth/mfa-client-codes";
import { resolveMfaMode, verifyMfaCode } from "@/lib/auth/mfa-policy";
import { consumeMfaRecoveryCode } from "@/lib/auth/mfa-recovery-codes";
import { reserveMfaVerificationAttempt } from "@/lib/auth/mfa-attempt-limits";
import { consumeTotpCounterForUser } from "@/lib/auth/mfa-totp-counters";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { withMfaAccountLock } from "@/lib/auth/mfa-account-lock";

class MfaFactorStoreUnavailableError extends Error {}

/** Verify, consume the factor, and issue its one-time grant as one account operation. */
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

  try {
    return await withMfaAccountLock(session.user.id, async () => {
      const recoveryAttempt = resolveMfaMode() === "totp" && submitted === "recovery";
      let attemptAlreadyReserved = false;
      if (recoveryAttempt) {
        try {
          const attempt = await reserveMfaVerificationAttempt(session.user.id);
          if (!attempt.allowed) {
            await recordOutcome("auth.mfa_verify_failed", "denied");
            return respond({
              error: "Too many verification attempts. Try again after the limit resets.",
              code: "limited",
            }, { status: 429, headers: {
              "Retry-After": String(attempt.retryAfterSeconds),
              "Cache-Control": "private, no-store",
            } });
          }
          attemptAlreadyReserved = true;
        } catch (error) {
          console.error("[auth] MFA verify attempt reserve failed", {
            userId: session.user.id,
            message: error instanceof Error ? error.message : String(error),
          });
          await recordOutcome("auth.mfa_verify_unavailable", "error");
          return respond({ error: "MFA verification safeguards are unavailable.",
            code: "attempt_store_unavailable" }, { status: 503,
            headers: { "Cache-Control": "private, no-store" } });
        }
      }

      let matchedCounter: number | undefined;
      if (!recoveryAttempt) {
        const result = await verifyMfaCode({
          userId: session.user.id,
          code,
          attemptAlreadyReserved,
          consumeCounter: false,
        });
        if (!result.ok) {
          await recordOutcome(result.status === 503 ? "auth.mfa_verify_unavailable" : "auth.mfa_verify_failed",
            result.status === 503 ? "error" : "denied");
          return respond({ error: result.error, code: result.code,
            ...(result.code === "not_enrolled" ? { needsEnrollment: true } : {}) }, {
            status: result.status,
            ...(result.status === 429 ? { headers: { "Retry-After": String(result.retryAfterSeconds ?? 900),
              "Cache-Control": "private, no-store" } } : {}),
          });
        }
        matchedCounter = result.matchedCounter;
      }

      await assertNoPendingMfaGrant(
        session.user.id,
        Date.now(),
        session.user.sessionVersion ?? 0,
      );

      if (typeof matchedCounter === "number") {
        let consumed: boolean;
        try {
          consumed = await consumeTotpCounterForUser(session.user.id, matchedCounter);
        } catch (error) {
          throw new MfaFactorStoreUnavailableError(error instanceof Error ? error.message : String(error));
        }
        if (!consumed) {
          await recordOutcome("auth.mfa_verify_failed", "denied");
          return respond({ error: "That code was already used.", code: "replayed" }, { status: 400 });
        }
      } else if (recoveryAttempt) {
        let recoveryUsed: boolean;
        try {
          recoveryUsed = await consumeMfaRecoveryCode(session.user.id, code);
        } catch (error) {
          throw new MfaFactorStoreUnavailableError(error instanceof Error ? error.message : String(error));
        }
        if (!recoveryUsed) {
          await recordOutcome("auth.mfa_verify_failed", "denied");
          return respond({ error: "Invalid code", code: "invalid" }, { status: 400 });
        }
      }

      const mfaGrant = await issueMfaGrant(
        session.user.id,
        Date.now(),
        session.user.sessionVersion ?? 0,
        process.env,
        { rejectPending: true },
      );
      await recordOutcome(recoveryAttempt ? "auth.mfa_recovery_code_use" : "auth.mfa_verify", "success");
      return respond({ success: true, mfaGrant });
    });
  } catch (error) {
    if (error instanceof MfaGrantPendingError) {
      await recordOutcome("auth.mfa_verify_failed", "denied");
      return respond({ error: "A verified sign-in is already waiting to finish in this browser. Complete it before trying another code.",
        code: "grant_pending" }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
    }
    if (error instanceof MfaFactorStoreUnavailableError) {
      console.error("[auth] MFA replay protection unavailable", {
        userId: session.user.id,
        message: error.message,
      });
      await recordOutcome("auth.mfa_verify_unavailable", "error");
      return respond({ error: "MFA replay protection is unavailable.",
        code: "replay_store_unavailable" }, { status: 503,
        headers: { "Cache-Control": "private, no-store" } });
    }
    console.error("[auth] MFA factor handoff failed", {
      userId: session.user.id,
      message: error instanceof Error ? error.message : String(error),
    });
    await recordOutcome("auth.mfa_verify_unavailable", "error");
    return respond({ error: "Could not create a secure session grant. Try again shortly.",
      code: "grant_unavailable" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
