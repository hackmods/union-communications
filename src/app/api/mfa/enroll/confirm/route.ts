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
import { withMfaAccountLock } from "@/lib/auth/mfa-account-lock";

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
  let confirmed:
    | { recoveryCodes: string[]; mfaGrant: string }
    | { error: "no_pending" | "invalid" };
  try {
    confirmed = await withMfaAccountLock(session.user.id, async () => {
      // Hold the pending-row lock until all confirmation writes commit. This
      // makes a duplicate confirm observe the consumed placeholder.
      const pendingSecret = await getPendingSecret(
        session.user.id,
        Date.now(),
        process.env,
        { forUpdate: true },
      );
      if (!pendingSecret) return { error: "no_pending" as const };

      const acceptedCounter = matchTotpCounter(pendingSecret, code);
      if (acceptedCounter === null) return { error: "invalid" as const };

      await persistTotpSecretForUser(session.user.id, pendingSecret, acceptedCounter);
      // Enrollment already bumps the version; rotate hashes in the same
      // transaction without invalidating the version a second time.
      const recoveryCodes = await rotateMfaRecoveryCodes(
        session.user.id,
        process.env,
        { bumpSessionVersion: false },
      );
      await clearPendingSecret(session.user.id);
      const sessionVersion = await getSessionVersionForUser(session.user.id);
      const mfaGrant = await issueMfaGrant(session.user.id, Date.now(), sessionVersion);
      await auditLog.log({
        userId: session.user.id,
        action: "auth.mfa_enroll",
        resourceType: "session",
        resourceId: session.user.id,
        unionId: session.user.unionId,
        localId: session.user.localId,
      });
      return { recoveryCodes, mfaGrant };
    });
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
  if ("error" in confirmed) {
    if (confirmed.error === "no_pending") {
      return NextResponse.json({
        error: "No pending enrollment. It may already be confirmed; sign in with your authenticator, or generate a new QR code if setup did not finish.",
        code: "no_pending",
      }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json(
      { error: "Invalid code", code: "invalid" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    recoveryCodes: confirmed.recoveryCodes,
    mfaGrantIssued: true,
    mfaGrant: confirmed.mfaGrant,
  });
}
