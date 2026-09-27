import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import {
  clearPendingSecret,
  getPendingSecret,
} from "@/lib/auth/mfa-enrollment-store";
import { persistTotpSecretForUser } from "@/lib/auth/mfa-user-secret";
import { rotateMfaRecoveryCodes } from "@/lib/auth/mfa-recovery-codes";
import { resolveMfaMode } from "@/lib/auth/mfa-policy";
import { matchTotpCounter } from "@/lib/auth/totp";

/**
 * Confirms TOTP enrollment: the user must prove they scanned the QR by
 * submitting a currently-valid code before the pending secret is persisted.
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
      },
      { status: 503 },
    );
  }

  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const pendingSecret = getPendingSecret(session.user.id);
  if (!pendingSecret) {
    return NextResponse.json(
      { error: "No pending enrollment. Generate a new QR code and try again." },
      { status: 400 },
    );
  }

  const code = (body.code ?? "").trim();
  const acceptedCounter = matchTotpCounter(pendingSecret, code);
  if (acceptedCounter === null) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await persistTotpSecretForUser(session.user.id, pendingSecret, acceptedCounter);
  const recoveryCodes = await rotateMfaRecoveryCodes(session.user.id);
  clearPendingSecret(session.user.id);

  await auditLog.log({
    userId: session.user.id,
    action: "auth.mfa_enroll",
    resourceType: "session",
    resourceId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ success: true, recoveryCodes });
}
