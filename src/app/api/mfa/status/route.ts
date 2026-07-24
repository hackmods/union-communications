import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  isMfaEnabled,
  needsTotpEnrollment,
  resolveMfaMode,
  sessionMfaOk,
} from "@/lib/auth/mfa-policy";

/** Client helper: MFA host policy + enrollment / verified state. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const enabled = isMfaEnabled();
  const mode = resolveMfaMode();
  const needsEnrollment =
    enabled && mode === "totp"
      ? await needsTotpEnrollment(session.user.id)
      : false;
  return NextResponse.json({
    enabled,
    mode,
    needsEnrollment,
    mfaVerified: sessionMfaOk(session),
  });
}
