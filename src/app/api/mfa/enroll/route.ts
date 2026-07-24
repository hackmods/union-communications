import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildOtpauthUri, generateTotpSecret } from "@/lib/auth/mfa-enrollment";
import { setPendingSecret } from "@/lib/auth/mfa-enrollment-store";
import { resolveMfaMode } from "@/lib/auth/mfa-policy";

/**
 * Starts (or restarts) TOTP enrollment: generates a fresh secret, stashes it
 * as "pending" for this user, and returns the `otpauth://` URI for a QR code.
 * The secret is only persisted once confirmed via `/api/mfa/enroll/confirm`.
 */
export async function POST() {
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

  const secret = generateTotpSecret();
  setPendingSecret(session.user.id, secret);
  const otpauthUri = buildOtpauthUri(
    secret,
    session.user.email ?? session.user.id,
  );

  return NextResponse.json({ secret, otpauthUri });
}
