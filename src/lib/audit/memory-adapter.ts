import type { AuditEntry, AuditLogAdapter } from "./adapter";

const store: AuditEntry[] = [];

export class MemoryAuditLogAdapter implements AuditLogAdapter {
  async log(
    entry: Omit<AuditEntry, "id" | "timestamp">,
  ): Promise<AuditEntry> {
    const full: AuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    store.push(full);
    return full;
  }

  async query(filters: {
    unionId?: string;
    localId?: string;
    resourceType?: string;
    limit?: number;
  }): Promise<AuditEntry[]> {
    let results = [...store];
    if (filters.unionId) {
      results = results.filter((e) => e.unionId === filters.unionId);
    }
    if (filters.localId) {
      results = results.filter((e) => e.localId === filters.localId);
    }
    if (filters.resourceType) {
      results = results.filter((e) => e.resourceType === filters.resourceType);
    }
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return results.slice(0, filters.limit ?? 50);
  }
}

export const auditLog: AuditLogAdapter = new MemoryAuditLogAdapter();
