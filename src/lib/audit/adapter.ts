export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  unionId?: string;
  localId?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface AuditLogAdapter {
  log(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<AuditEntry>;
  query(filters: {
    unionId?: string;
    localId?: string;
    resourceType?: string;
    limit?: number;
  }): Promise<AuditEntry[]>;
}
