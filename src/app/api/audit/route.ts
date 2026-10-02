import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { auditLog } from "@/lib/audit/store";
import type { AuditEntry, AuditOutcome } from "@/lib/audit/adapter";
import type { UserRole } from "@/types/tenant";

const AUDIT_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
];

const OUTCOMES: AuditOutcome[] = ["success", "denied", "error", "unknown"];

function parseIsoDate(value: string | null): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function filterAuditEntries(
  entries: AuditEntry[],
  filters: {
    from?: Date;
    to?: Date;
    userId?: string;
    outcome?: AuditOutcome;
  },
): AuditEntry[] {
  let result = entries;
  if (filters.from) {
    const fromMs = filters.from.getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() >= fromMs);
  }
  if (filters.to) {
    const toMs = filters.to.getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() <= toMs);
  }
  if (filters.userId) {
    const needle = filters.userId.trim().toLowerCase();
    result = result.filter((e) => e.userId.toLowerCase().includes(needle));
  }
  if (filters.outcome) {
    result = result.filter((e) => e.outcome === filters.outcome);
  }
  return result;
}

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

  const from = parseIsoDate(url.searchParams.get("from"));
  const to = parseIsoDate(url.searchParams.get("to"));
  const userId =
    url.searchParams.get("userId")?.trim() ||
    url.searchParams.get("actor")?.trim() ||
    undefined;
  const outcomeRaw = url.searchParams.get("outcome");
  const outcome =
    outcomeRaw && OUTCOMES.includes(outcomeRaw as AuditOutcome)
      ? (outcomeRaw as AuditOutcome)
      : undefined;

  const fetchLimit =
    from || to || userId || outcome ? Math.min(limit * 4, 500) : limit;

  const entries = await auditLog.query({
    unionId: session.user.unionId,
    localId: session.user.localId,
    limit: fetchLimit,
  });

  const filtered = filterAuditEntries(entries, {
    from,
    to,
    userId,
    outcome,
  }).slice(0, limit);

  return NextResponse.json({ entries: filtered });
}
