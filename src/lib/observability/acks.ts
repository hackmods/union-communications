import { desc, eq } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { observabilityIssueAcks } from "@/lib/db/schema/observability";
import {
  acknowledgeFileIssue,
  listFileAcks,
  unacknowledgeFileIssue,
} from "@/lib/observability/file-alert-store";
import { resolveObservabilityConfig } from "@/lib/observability/config";

export type ObservabilityAck = {
  fingerprint: string;
  acknowledgedAt: string;
  acknowledgedBy: string;
  note?: string;
};

function rowToAck(
  row: typeof observabilityIssueAcks.$inferSelect,
): ObservabilityAck {
  return {
    fingerprint: row.fingerprint,
    acknowledgedAt:
      row.acknowledgedAt instanceof Date
        ? row.acknowledgedAt.toISOString()
        : String(row.acknowledgedAt),
    acknowledgedBy: row.acknowledgedBy,
    note: row.note ?? undefined,
  };
}

function fileAcksAvailable(): boolean {
  if (isPostgresConfigured()) return false;
  const cfg = resolveObservabilityConfig();
  return Boolean(cfg.errorLogFileEnabled && cfg.errorLogFilePath);
}

export async function listObservabilityAcks(): Promise<ObservabilityAck[]> {
  if (isPostgresConfigured()) {
    const rows = await getDb()
      .select()
      .from(observabilityIssueAcks)
      .orderBy(desc(observabilityIssueAcks.acknowledgedAt));
    return rows.map(rowToAck);
  }
  if (fileAcksAvailable()) return listFileAcks();
  return [];
}

export async function acknowledgeObservabilityIssue(input: {
  fingerprint: string;
  userId: string;
  note?: string;
}): Promise<ObservabilityAck> {
  if (!isPostgresConfigured()) {
    return acknowledgeFileIssue(input);
  }
  const now = new Date();
  const [row] = await getDb()
    .insert(observabilityIssueAcks)
    .values({
      fingerprint: input.fingerprint,
      acknowledgedAt: now,
      acknowledgedBy: input.userId,
      note: input.note?.slice(0, 500) || null,
    })
    .onConflictDoUpdate({
      target: observabilityIssueAcks.fingerprint,
      set: {
        acknowledgedAt: now,
        acknowledgedBy: input.userId,
        note: input.note?.slice(0, 500) || null,
      },
    })
    .returning();
  return rowToAck(row);
}

export async function unacknowledgeObservabilityIssue(
  fingerprint: string,
): Promise<boolean> {
  if (!isPostgresConfigured()) {
    return unacknowledgeFileIssue(fingerprint);
  }
  const deleted = await getDb()
    .delete(observabilityIssueAcks)
    .where(eq(observabilityIssueAcks.fingerprint, fingerprint))
    .returning({ fingerprint: observabilityIssueAcks.fingerprint });
  return deleted.length > 0;
}

export function acksBackend(): "postgres" | "file" | "none" {
  if (isPostgresConfigured()) return "postgres";
  if (fileAcksAvailable()) return "file";
  return "none";
}
