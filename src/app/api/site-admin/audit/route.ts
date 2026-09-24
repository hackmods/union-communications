import { and, desc, eq, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import type { AuditEntry } from "@/lib/audit/adapter";
import { auditDbBackend } from "@/lib/db/backend";
import { getDb } from "@/lib/db/client";
import { auditLog as auditLogTable } from "@/lib/db/schema";
import {
  getOwnerDb,
  isOwnerDbConfigured,
} from "@/lib/db/owner-client";

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Cross-tenant site_admin audit rows. Uses owner DB when available so RLS
 * does not hide rows that carry a foreign union_id.
 */
async function querySiteAdminAudit(limit: number): Promise<AuditEntry[]> {
  if (auditDbBackend() !== "postgres") {
    return auditLog.query({ resourceType: "site_admin", limit });
  }

  const db = isOwnerDbConfigured() ? getOwnerDb() : getDb();
  const conditions: SQL[] = [eq(auditLogTable.resourceType, "site_admin")];
  const rows = await db
    .select()
    .from(auditLogTable)
    .where(and(...conditions))
    .orderBy(desc(auditLogTable.timestamp))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    unionId: row.unionId ?? undefined,
    localId: row.localId ?? undefined,
    metadata: row.metadata ?? undefined,
    timestamp: toIso(row.timestamp),
  }));
}

/**
 * GET /api/site-admin/audit — platform_admin operator action log.
 * Does not widen tenant /api/audit.
 */
export async function GET(request: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200)
    : 100;

  const entries = await querySiteAdminAudit(limit);

  await auditLog.log({
    userId: gate.session.user.id!,
    action: "site_admin.audit.list",
    resourceType: "site_admin",
    resourceId: "*",
    metadata: {
      limit: String(limit),
      count: String(entries.length),
      ownerRead: isOwnerDbConfigured() && auditDbBackend() === "postgres" ? "true" : "false",
    },
  });

  return NextResponse.json({ entries });
}
