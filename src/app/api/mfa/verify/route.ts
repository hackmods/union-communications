import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/memory-adapter";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { code?: string };
  // Dev MFA: accept 000000 or any 6-digit code
  if (!body.code || body.code.length !== 6) {
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
