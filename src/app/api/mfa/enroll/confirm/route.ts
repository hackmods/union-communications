import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import {
  clearPendingSecret,
  getPendingSecret,
} from "@/lib/auth/mfa-enrollment-store";
import { issueMfaGrant } from "@/lib/auth/mfa-grants";
import {
  getSessionVersionForUser,
  persistTotpSecretForUser,
} from "@/lib/auth/mfa-user-secret";
import { rotateMfaRecoveryCodes } from "@/lib/auth/mfa-recovery-codes";
import { resolveMfaMode } from "@/lib/auth/mfa-policy";
import { looksLikeTotpCode } from "@/lib/auth/mfa-client-codes";
import { matchTotpCounter } from "@/lib/auth/totp";

/**
 * Confirms TOTP enrollment: the user must prove they scanned the QR by
 * submitting a currently-valid code before the pending secret is persisted.
 * Possession is enough for the session — a grant is issued so the client does
 * not have to re-enter the same authenticator code.
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

  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid code", code: "invalid" },
      { status: 400 },
    );
  }

  let pendingSecret: string | null;
  try {
    pendingSecret = await getPendingSecret(session.user.id);
  } catch (error) {
    console.error("[auth] MFA pending enrollment read failed", {
      userId: session.user.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error:
          "Authenticator setup could not read the QR secret. Ask whoever runs this Officer Hub to check pending enrollment storage.",
        code: "enrollment_store_unavailable",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (!pendingSecret) {
    return NextResponse.json(
      {
        error: "No pending enrollment. Generate a new QR code and try again.",
        code: "no_pending",
      },
      { status: 400 },
    );
  }

  const code = (body.code ?? "").trim();
  if (!code) {
    return NextResponse.json(
      { error: "Enter a verification code.", code: "empty" },
      { status: 400 },
    );
  }
  if (!looksLikeTotpCode(code)) {
    return NextResponse.json(
      { error: "Invalid code", code: "invalid" },
      { status: 400 },
    );
  }
  const acceptedCounter = matchTotpCounter(pendingSecret, code);
  if (acceptedCounter === null) {
    return NextResponse.json(
      { error: "Invalid code", code: "invalid" },
      { status: 400 },
    );
  }

  let recoveryCodes: string[];
  try {
    // Persist secret first; recovery rotate may memory-fallback and still succeed.
    await persistTotpSecretForUser(session.user.id, pendingSecret, acceptedCounter);
    recoveryCodes = await rotateMfaRecoveryCodes(session.user.id);
    await clearPendingSecret(session.user.id);
  } catch (error) {
    console.error("[auth] MFA enrollment persist failed", {
      userId: session.user.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error:
          "Could not save authenticator setup. Ask whoever runs this Officer Hub to confirm multi-factor storage is ready, then generate a new QR code.",
        code: "enrollment_store_unavailable",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  let mfaGrant: string | undefined;
  try {
    const sessionVersion = await getSessionVersionForUser(session.user.id);
    mfaGrant = await issueMfaGrant(session.user.id, Date.now(), sessionVersion);
  } catch (error) {
    console.error("[auth] MFA enrollment grant issue failed", {
      userId: session.user.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "auth.mfa_enroll",
    resourceType: "session",
    resourceId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({
    success: true,
    recoveryCodes,
    mfaGrantIssued: Boolean(mfaGrant),
    ...(mfaGrant ? { mfaGrant } : {}),
  });
}
