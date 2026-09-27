import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  isHostedCustomerMode,
  isMfaEnabled,
  needsTotpEnrollment,
  resolveMfaMode,
} from "@/lib/auth/mfa-policy";
import { sessionRequiresMfa } from "@/lib/auth/mfa-requirements";
import { actorHasHostedMfaCapability } from "@/lib/authorization/model";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { countUnusedMfaRecoveryCodes } from "@/lib/auth/mfa-recovery-codes";
import { actorHasActiveCircleAdminAuthority } from "@/lib/portal/mfa-authority";

/** Client helper: MFA host policy + enrollment / verified state. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const enabled = isMfaEnabled();
  const mode = resolveMfaMode();
  let required = sessionRequiresMfa(
    session.user,
    enabled,
    isHostedCustomerMode(),
  );
  if (isHostedCustomerMode()) {
    try {
      const actor = await resolveAuthorizationActor(session);
      required = required || actorHasHostedMfaCapability(actor);
      if (!required) {
        required = await actorHasActiveCircleAdminAuthority(actor);
      }
    } catch {
      // A hosted account lookup must not silently classify the user as exempt.
      required = true;
    }
  }
  const needsEnrollment =
    enabled && required && mode === "totp"
      ? await needsTotpEnrollment(session.user.id, process.env, required)
      : false;
  let recoveryCodesRemaining: number | null = null;
  if (mode === "totp" && !needsEnrollment) {
    try {
      recoveryCodesRemaining = await countUnusedMfaRecoveryCodes(session.user.id);
    } catch {
      // Surface unavailable status as unknown; never report a false zero count.
      recoveryCodesRemaining = null;
    }
  }
  return NextResponse.json({
    enabled,
    required,
    mode,
    needsEnrollment,
    mfaVerified: Boolean(session.user.mfaVerified),
    recoveryCodesRemaining,
  });
}
