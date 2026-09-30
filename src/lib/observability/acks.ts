import { desc, eq } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { observabilityIssueAcks } from "@/lib/db/schema/observability";

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

export async function listObservabilityAcks(): Promise<ObservabilityAck[]> {
  if (!isPostgresConfigured()) return [];
  const rows = await getDb()
    .select()
    .from(observabilityIssueAcks)
    .orderBy(desc(observabilityIssueAcks.acknowledgedAt));
  return rows.map(rowToAck);
}

export async function acknowledgeObservabilityIssue(input: {
  fingerprint: string;
  userId: string;
  note?: string;
}): Promise<ObservabilityAck> {
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
  const deleted = await getDb()
    .delete(observabilityIssueAcks)
    .where(eq(observabilityIssueAcks.fingerprint, fingerprint))
    .returning({ fingerprint: observabilityIssueAcks.fingerprint });
  return deleted.length > 0;
}
