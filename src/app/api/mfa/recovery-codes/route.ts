import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { resolveMfaMode, verifyMfaCode } from "@/lib/auth/mfa-policy";
import { rotateMfaRecoveryCodes } from "@/lib/auth/mfa-recovery-codes";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";

/** Rotate recovery codes only after a fresh authenticator challenge. */
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
  const recordOutcome = (outcome: "success" | "denied" | "error") =>
    auditLog.log({
      userId: session.user.id,
      action: "auth.mfa_recovery_codes_rotate",
      resourceType: "user",
      resourceId: session.user.id,
      unionId: session.user.unionId,
      localId: session.user.localId,
      outcome,
      requestId: correlation.requestId,
    });
  if (resolveMfaMode() !== "totp") {
    await recordOutcome("error");
    return respond(
      { error: "TOTP is not available." },
      { status: 503 },
    );
  }

  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    await recordOutcome("denied");
    return respond({ error: "Invalid code" }, { status: 400 });
  }
  const result = await verifyMfaCode({
    userId: session.user.id,
    code: body.code ?? "",
  });
  if (!result.ok) {
    await recordOutcome(result.status === 503 ? "error" : "denied");
    return respond(
      { error: "Fresh authenticator verification required." },
      {
        status: result.status,
        ...(result.status === 429
          ? {
              headers: {
                "Retry-After": String(result.retryAfterSeconds ?? 900),
                "Cache-Control": "private, no-store",
              },
            }
          : {}),
      },
    );
  }

  const recoveryCodes = await rotateMfaRecoveryCodes(session.user.id);
  await auditLog.log({
    userId: session.user.id,
    action: "auth.mfa_recovery_codes_rotate",
    resourceType: "user",
    resourceId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
    outcome: "success",
    requestId: correlation.requestId,
  });
  return respond({ success: true, recoveryCodes });
}
