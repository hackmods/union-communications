import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildOtpauthUri, generateTotpSecret, resolveTotpAuthenticatorImageUrl } from "@/lib/auth/mfa-enrollment";
import { setPendingSecret } from "@/lib/auth/mfa-enrollment-store";
import { consumeMfaRecoveryCode } from "@/lib/auth/mfa-recovery-codes";
import { reserveMfaVerificationAttempt } from "@/lib/auth/mfa-attempt-limits";
import { classifySubmittedMfaCode } from "@/lib/auth/mfa-client-codes";
import { resolveMfaMode, verifyMfaCode } from "@/lib/auth/mfa-policy";
import { withMfaAccountLock } from "@/lib/auth/mfa-account-lock";
import { consumeTotpCounterForUser } from "@/lib/auth/mfa-totp-counters";
import { getTotpSecretForUser } from "@/lib/auth/mfa-user-secret";

type EnrollResult =
  | { ok: true; secret: string; expiresAt: number; replacing: boolean }
  | {
      ok: false;
      status: 400 | 409 | 429 | 503;
      code: string;
      error: string;
      retryAfterSeconds?: number;
    };

/**
 * Start TOTP enrollment. Existing factors stay active until the new QR is
 * confirmed. A fresh TOTP or one saved recovery code can authorize replacing
 * the current authenticator; the selected proof and pending QR are committed
 * together under the account lock.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = resolveMfaMode();
  if (mode !== "totp") {
    return NextResponse.json(
      {
        error:
          "TOTP enrollment requires AUTH_MFA_MODE=totp on this instance.",
        code: "storage_unavailable",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({})) as {
    code?: string;
    recoveryCode?: string;
  };
  const code = (body.code ?? "").trim();
  const recoveryCode = (body.recoveryCode ?? "").trim();
  const proofKind = recoveryCode ? "recovery" : code ? "totp" : null;
  const proof = recoveryCode || code;
  const proofType = proofKind ? classifySubmittedMfaCode(proof) : "empty";
  const secret = generateTotpSecret();

  let result: EnrollResult;
  try {
    result = await withMfaAccountLock(session.user.id, async () => {
      const existingSecret = await getTotpSecretForUser(session.user.id);
      if (existingSecret) {
        if (!proofKind || proofType === "empty") {
          return {
            ok: false,
            status: 400,
            error: "A current authenticator or saved recovery code is required to replace this authenticator.",
            code: "empty",
          };
        }
        if (proofType !== proofKind) {
          return {
            ok: false,
            status: 400,
            error: "Enter a valid authenticator or recovery code.",
            code: "invalid",
          };
        }

        if (proofKind === "totp") {
          const verified = await verifyMfaCode({
            userId: session.user.id,
            code: proof,
            consumeCounter: false,
          });
          if (!verified.ok) {
            return {
              ok: false,
              status: verified.status,
              error: verified.error,
              code: verified.code,
              retryAfterSeconds: verified.retryAfterSeconds,
            };
          }
          if (
            verified.matchedCounter === undefined ||
            !(await consumeTotpCounterForUser(session.user.id, verified.matchedCounter))
          ) {
            return {
              ok: false,
              status: 400,
              error: "That authenticator code was already used.",
              code: "replayed",
            };
          }
        } else {
          let attempt: Awaited<ReturnType<typeof reserveMfaVerificationAttempt>>;
          try {
            attempt = await reserveMfaVerificationAttempt(session.user.id);
          } catch (error) {
            console.error("[auth] MFA replacement attempt reserve failed", {
              userId: session.user.id,
              message: error instanceof Error ? error.message : String(error),
            });
            return {
              ok: false,
              status: 503,
              error: "MFA verification safeguards are unavailable.",
              code: "attempt_store_unavailable",
            };
          }
          if (!attempt.allowed) {
            return {
              ok: false,
              status: 429,
              error: "Too many verification attempts. Try again after the limit resets.",
              code: "limited",
              retryAfterSeconds: attempt.retryAfterSeconds,
            };
          }
          if (!(await consumeMfaRecoveryCode(session.user.id, proof))) {
            return {
              ok: false,
              status: 400,
              error: "Invalid or already used recovery code.",
              code: "invalid",
            };
          }
        }
      } else if (proofKind) {
        return {
          ok: false,
          status: 409,
          error: "This account no longer has an authenticator to replace. Refresh the page and start setup again.",
          code: "enrollment_state_changed",
        };
      }

      const expiresAt = await setPendingSecret(session.user.id, secret);
      return { ok: true, secret, expiresAt, replacing: Boolean(existingSecret) };
    });
  } catch (error) {
    console.error("[auth] MFA pending enrollment store unavailable", {
      userId: session.user.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error:
          "Authenticator setup could not save the QR secret. Ask whoever runs this Officer Hub to check pending enrollment storage.",
        code: "enrollment_store_unavailable",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code, requiresCurrentCode: true },
      {
        status: result.status,
        headers: {
          "Cache-Control": "private, no-store",
          ...(result.status === 429
            ? { "Retry-After": String(result.retryAfterSeconds ?? 900) }
            : {}),
        },
      },
    );
  }

  const otpauthUri = buildOtpauthUri(
    result.secret,
    session.user.email ?? session.user.id,
    undefined,
    resolveTotpAuthenticatorImageUrl(),
  );

  return NextResponse.json({
    secret: result.secret,
    otpauthUri,
    replacing: result.replacing,
    expiresAt: result.expiresAt,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
