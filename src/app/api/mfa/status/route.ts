import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import {
  isHostedCustomerMode,
  isMfaEnabled,
  needsTotpEnrollment,
  resolveMfaMode,
} from "@/lib/auth/mfa-policy";
import { sessionRequiresMfaWithGrace } from "@/lib/auth/mfa-requirements-grace";
import { isMfaOperatorBypassEmail } from "@/lib/auth/mfa-operator-bypass";
import {
  getMfaReenrollGrace,
  isMfaReenrollGraceActive,
} from "@/lib/auth/mfa-reenroll-grace";
import { actorHasHostedMfaCapability } from "@/lib/authorization/model";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { countUnusedMfaRecoveryCodes } from "@/lib/auth/mfa-recovery-codes";
import { getTotpSecretForUser } from "@/lib/auth/mfa-user-secret";
import { actorHasActiveCircleAdminAuthority } from "@/lib/portal/mfa-authority";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { mfaErrorMetadata } from "@/lib/auth/mfa-durable-fallback-signal";

/** Client helper: MFA host policy + enrollment / verified state. */
export async function GET() {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(correlation.responseHeaders(init.headers));
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, { ...init, headers });
  };
  let session: Session | null;
  try {
    session = await auth();
  } catch (error) {
    console.error("[auth] MFA status session read failed", {
      requestId: correlation.requestId,
      ...mfaErrorMetadata(error),
    });
    return respond({
      error: "MFA status is temporarily unavailable.",
      code: "status_unavailable",
      requestId: correlation.requestId,
    }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  if (!session?.user) {
    return respond({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }
  try {
    const enabled = isMfaEnabled();
    const mode = resolveMfaMode();
    const operatorBypass = isMfaOperatorBypassEmail(session.user.email);
    const reenrollGraceActive = await isMfaReenrollGraceActive(session.user.id);
    const reenrollGraceUntil = reenrollGraceActive
      ? (await getMfaReenrollGrace(session.user.id))?.toISOString() ?? null
      : null;

    let required = await sessionRequiresMfaWithGrace(
      session.user,
      enabled,
      isHostedCustomerMode(),
    );
    if (isHostedCustomerMode() && !operatorBypass && !reenrollGraceActive) {
      const actor = await resolveAuthorizationActor(session);
      required = required || actorHasHostedMfaCapability(actor);
      if (!required) {
        required = await actorHasActiveCircleAdminAuthority(actor);
      }
    }
    if (operatorBypass || reenrollGraceActive) required = false;
    const enrolled =
      mode === "totp" ? Boolean(await getTotpSecretForUser(session.user.id)) : false;
    const needsEnrollment =
      enabled && required && mode === "totp"
        ? await needsTotpEnrollment(session.user.id, process.env, required)
        : false;
    let recoveryCodesRemaining: number | null = null;
    if (mode === "totp" && enrolled) {
      try {
        recoveryCodesRemaining = await countUnusedMfaRecoveryCodes(session.user.id);
      } catch {
        // Surface unavailable status as unknown; never report a false zero count.
        recoveryCodesRemaining = null;
      }
    }
    return respond({
      enabled,
      required,
      mode,
      enrolled,
      needsEnrollment,
      mfaVerified: Boolean(session.user.mfaVerified),
      recoveryCodesRemaining,
      reenrollGrace: reenrollGraceActive,
      reenrollGraceUntil,
    });
  } catch (error) {
    console.error("[auth] MFA status unavailable", {
      userId: session.user.id,
      requestId: correlation.requestId,
      ...mfaErrorMetadata(error),
    });
    return respond({
      error: "MFA status is temporarily unavailable.",
      code: "status_unavailable",
      requestId: correlation.requestId,
    }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
