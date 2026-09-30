import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildOtpauthUri, generateTotpSecret, resolveTotpAuthenticatorImageUrl } from "@/lib/auth/mfa-enrollment";
import { setPendingSecret } from "@/lib/auth/mfa-enrollment-store";
import { resolveMfaMode, verifyMfaCode } from "@/lib/auth/mfa-policy";
import { getTotpSecretForUser } from "@/lib/auth/mfa-user-secret";

/**
 * Starts (or restarts) TOTP enrollment: generates a fresh secret, stashes it
 * as "pending" for this user, and returns the `otpauth://` URI for a QR code.
 * The secret is only persisted once confirmed via `/api/mfa/enroll/confirm`.
 *
 * When an authenticator is already enrolled, replacing it requires a current
 * verification code — re-enrollment overwrites the single account secret.
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

  const existingSecret = await getTotpSecretForUser(session.user.id);
  if (existingSecret) {
    let body: { code?: string } = {};
    try {
      body = (await request.json()) as { code?: string };
    } catch {
      return NextResponse.json(
        {
          error:
            "Current verification code required to replace your authenticator.",
          requiresCurrentCode: true,
        },
        { status: 400 },
      );
    }
    const code = (body.code ?? "").trim();
    if (!code) {
      return NextResponse.json(
        {
          error:
            "Current verification code required to replace your authenticator.",
          code: "empty",
          requiresCurrentCode: true,
        },
        { status: 400 },
      );
    }
    const verified = await verifyMfaCode({
      userId: session.user.id,
      code,
    });
    if (!verified.ok) {
      return NextResponse.json(
        {
          error: verified.error,
          code: verified.code,
          requiresCurrentCode: true,
        },
        {
          status: verified.status,
          ...(verified.status === 429
            ? {
                headers: {
                  "Retry-After": String(verified.retryAfterSeconds ?? 900),
                  "Cache-Control": "private, no-store",
                },
              }
            : {}),
        },
      );
    }
  }

  const secret = generateTotpSecret();
  try {
    await setPendingSecret(session.user.id, secret);
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
  const otpauthUri = buildOtpauthUri(
    secret,
    session.user.email ?? session.user.id,
    undefined,
    resolveTotpAuthenticatorImageUrl(),
  );

  return NextResponse.json({ secret, otpauthUri, replacing: Boolean(existingSecret) });
}
