import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { auditLog } from "@/lib/audit/store";
import type { UserRole } from "@/types/tenant";

const AUDIT_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!roles.some((r) => AUDIT_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    Number(url.searchParams.get("limit") ?? "50") || 50,
    200,
  );

  const entries = await auditLog.query({
    unionId: session.user.unionId,
    localId: session.user.localId,
    limit,
  });

  return NextResponse.json({ entries });
}
