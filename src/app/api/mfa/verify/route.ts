import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { issueMfaGrant } from "@/lib/auth/mfa-grants";
import { verifyMfaCode } from "@/lib/auth/mfa-policy";

/**
 * MFA verify — validates the code server-side, then issues a single-use
 * grant nonce. The client must pass that nonce through session.update({ mfaGrant })
 * so the JWT callback can set mfaVerified (SEC-001). Never trust a client boolean.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const result = await verifyMfaCode({
    userId: session.user.id,
    code: body.code ?? "",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  const mfaGrant = issueMfaGrant(session.user.id);

  await auditLog.log({
    userId: session.user.id,
    action: "auth.mfa_verify",
    resourceType: "session",
    resourceId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ success: true, mfaGrant });
}
