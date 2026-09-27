export type AuditOutcome = "success" | "denied" | "error" | "unknown";

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  unionId?: string;
  localId?: string;
  outcome: AuditOutcome;
  requestId?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export type AuditLogInput = Omit<AuditEntry, "id" | "timestamp" | "outcome"> & {
  outcome?: Exclude<AuditOutcome, "unknown">;
};

export interface AuditLogAdapter {
  log(entry: AuditLogInput): Promise<AuditEntry>;
  query(filters: {
    unionId?: string;
    localId?: string;
    resourceType?: string;
    limit?: number;
  }): Promise<AuditEntry[]>;
}
