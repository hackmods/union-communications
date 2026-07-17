import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/memory-adapter";

/**
 * MFA verify.
 * - Production: set AUTH_MFA_CODE to the shared offline code (or wire TOTP later).
 * - Dev default: accept the code in AUTH_DEV_MFA_CODE (default 000000) only —
 *   no longer accepts arbitrary 6-digit codes.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim() ?? "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const expected =
    process.env.AUTH_MFA_CODE ??
    process.env.AUTH_DEV_MFA_CODE ??
    "000000";

  if (code !== expected) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "auth.mfa_verify",
    resourceType: "session",
    resourceId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ success: true });
}
