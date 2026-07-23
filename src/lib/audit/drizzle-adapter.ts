import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLog as auditLogTable } from "@/lib/db/schema";
import type { AuditEntry, AuditLogAdapter } from "./adapter";

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export class DrizzleAuditLogAdapter implements AuditLogAdapter {
  async log(
    entry: Omit<AuditEntry, "id" | "timestamp">,
  ): Promise<AuditEntry> {
    const db = getDb();
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date();
    await db.insert(auditLogTable).values({
      id,
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      unionId: entry.unionId,
      localId: entry.localId,
      timestamp,
    });
    return {
      ...entry,
      id,
      timestamp: timestamp.toISOString(),
    };
  }

  async query(filters: {
    unionId?: string;
    localId?: string;
    resourceType?: string;
    limit?: number;
  }): Promise<AuditEntry[]> {
    const db = getDb();
    const conditions = [];
    if (filters.unionId) {
      conditions.push(eq(auditLogTable.unionId, filters.unionId));
    }
    if (filters.localId) {
      conditions.push(eq(auditLogTable.localId, filters.localId));
    }
    if (filters.resourceType) {
      conditions.push(eq(auditLogTable.resourceType, filters.resourceType));
    }

    const query = db.select().from(auditLogTable).orderBy(desc(auditLogTable.timestamp));
    const rows = conditions.length
      ? await query.where(and(...conditions)).limit(filters.limit ?? 50)
      : await query.limit(filters.limit ?? 50);

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      unionId: row.unionId ?? undefined,
      localId: row.localId ?? undefined,
      timestamp: toIso(row.timestamp),
    }));
  }
}
