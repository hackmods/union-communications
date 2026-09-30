import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import {
  observabilityAlertFirings,
  observabilityAlertRules,
  observabilityEvents,
  observabilityIssueAcks,
} from "@/lib/db/schema/observability";
import {
  levelMeetsMinimum,
  type ObservabilityAlertRuleLike,
} from "@/lib/observability/alert-rules";
import type {
  ObservabilityLevel,
  ObservabilitySource,
} from "@/lib/observability/types";

export type ObservabilityAlertRule = ObservabilityAlertRuleLike & {
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

function rowToRule(
  row: typeof observabilityAlertRules.$inferSelect,
): ObservabilityAlertRule {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    minLevel: row.minLevel,
    sources: row.sources ?? null,
    fingerprint: row.fingerprint ?? null,
    thresholdCount: row.thresholdCount,
    windowMinutes: row.windowMinutes,
    cooldownMinutes: row.cooldownMinutes,
    recipients: row.recipients ?? [],
    createdBy: row.createdBy,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    updatedBy: row.updatedBy,
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt),
  };
}

export async function listObservabilityAlertRules(): Promise<
  ObservabilityAlertRule[]
> {
  if (!isPostgresConfigured()) return [];
  const rows = await getDb()
    .select()
    .from(observabilityAlertRules)
    .orderBy(desc(observabilityAlertRules.updatedAt));
  return rows.map(rowToRule);
}

export async function listEnabledObservabilityAlertRules(): Promise<
  ObservabilityAlertRule[]
> {
  if (!isPostgresConfigured()) return [];
  const rows = await getDb()
    .select()
    .from(observabilityAlertRules)
    .where(eq(observabilityAlertRules.enabled, true));
  return rows.map(rowToRule);
}

export async function createObservabilityAlertRule(input: {
  name: string;
  enabled?: boolean;
  minLevel?: ObservabilityLevel;
  sources?: ObservabilitySource[] | null;
  fingerprint?: string | null;
  thresholdCount?: number;
  windowMinutes?: number;
  cooldownMinutes?: number;
  recipients: string[];
  userId: string;
}): Promise<ObservabilityAlertRule> {
  const now = new Date();
  const [row] = await getDb()
    .insert(observabilityAlertRules)
    .values({
      id: `oar-${randomUUID()}`,
      name: input.name.trim().slice(0, 120),
      enabled: input.enabled ?? true,
      minLevel: input.minLevel ?? "error",
      sources: input.sources?.length ? input.sources : null,
      fingerprint: input.fingerprint || null,
      thresholdCount: input.thresholdCount ?? 5,
      windowMinutes: input.windowMinutes ?? 15,
      cooldownMinutes: input.cooldownMinutes ?? 60,
      recipients: input.recipients,
      createdBy: input.userId,
      createdAt: now,
      updatedBy: input.userId,
      updatedAt: now,
    })
    .returning();
  return rowToRule(row);
}

export async function updateObservabilityAlertRule(input: {
  id: string;
  name?: string;
  enabled?: boolean;
  minLevel?: ObservabilityLevel;
  sources?: ObservabilitySource[] | null;
  fingerprint?: string | null;
  thresholdCount?: number;
  windowMinutes?: number;
  cooldownMinutes?: number;
  recipients?: string[];
  userId: string;
}): Promise<ObservabilityAlertRule | null> {
  const patch: Partial<typeof observabilityAlertRules.$inferInsert> = {
    updatedBy: input.userId,
    updatedAt: new Date(),
  };
  if (input.name !== undefined) patch.name = input.name.trim().slice(0, 120);
  if (input.enabled !== undefined) patch.enabled = input.enabled;
  if (input.minLevel !== undefined) patch.minLevel = input.minLevel;
  if (input.sources !== undefined) {
    patch.sources = input.sources?.length ? input.sources : null;
  }
  if (input.fingerprint !== undefined) {
    patch.fingerprint = input.fingerprint || null;
  }
  if (input.thresholdCount !== undefined) {
    patch.thresholdCount = input.thresholdCount;
  }
  if (input.windowMinutes !== undefined) {
    patch.windowMinutes = input.windowMinutes;
  }
  if (input.cooldownMinutes !== undefined) {
    patch.cooldownMinutes = input.cooldownMinutes;
  }
  if (input.recipients !== undefined) patch.recipients = input.recipients;

  const [row] = await getDb()
    .update(observabilityAlertRules)
    .set(patch)
    .where(eq(observabilityAlertRules.id, input.id))
    .returning();
  return row ? rowToRule(row) : null;
}

export async function deleteObservabilityAlertRule(
  id: string,
): Promise<boolean> {
  const deleted = await getDb()
    .delete(observabilityAlertRules)
    .where(eq(observabilityAlertRules.id, id))
    .returning({ id: observabilityAlertRules.id });
  return deleted.length > 0;
}

export async function getLastAlertFiring(
  ruleId: string,
): Promise<{ firedAt: string; eventCount: number } | null> {
  const [row] = await getDb()
    .select()
    .from(observabilityAlertFirings)
    .where(eq(observabilityAlertFirings.ruleId, ruleId))
    .orderBy(desc(observabilityAlertFirings.firedAt))
    .limit(1);
  if (!row) return null;
  return {
    firedAt:
      row.firedAt instanceof Date
        ? row.firedAt.toISOString()
        : String(row.firedAt),
    eventCount: row.eventCount,
  };
}

export async function recordAlertFiring(input: {
  ruleId: string;
  fingerprint?: string | null;
  eventCount: number;
  messageId?: string | null;
}): Promise<void> {
  await getDb().insert(observabilityAlertFirings).values({
    id: `oaf-${randomUUID()}`,
    ruleId: input.ruleId,
    fingerprint: input.fingerprint || null,
    firedAt: new Date(),
    eventCount: input.eventCount,
    messageId: input.messageId || null,
  });
}

export type MatchingIssueSample = {
  fingerprint: string;
  count: number;
  sampleMessage: string;
  level: ObservabilityLevel;
};

/**
 * Count non-acked events matching a rule window. Returns samples for the email.
 */
export async function collectMatchingIssuesForRule(
  rule: ObservabilityAlertRuleLike,
  now = new Date(),
): Promise<{ eventCount: number; issues: MatchingIssueSample[] }> {
  if (!isPostgresConfigured()) return { eventCount: 0, issues: [] };

  const since = new Date(now.getTime() - rule.windowMinutes * 60_000);
  const conditions = [gte(observabilityEvents.ts, since)];

  if (rule.fingerprint) {
    conditions.push(eq(observabilityEvents.fingerprint, rule.fingerprint));
  }
  if (rule.sources && rule.sources.length > 0) {
    conditions.push(inArray(observabilityEvents.source, rule.sources));
  }
  if (rule.minLevel === "error") {
    conditions.push(eq(observabilityEvents.level, "error"));
  } else if (rule.minLevel === "warn") {
    conditions.push(
      inArray(observabilityEvents.level, ["error", "warn"] as ObservabilityLevel[]),
    );
  }

  const rows = await getDb()
    .select({
      fingerprint: observabilityEvents.fingerprint,
      level: observabilityEvents.level,
      message: observabilityEvents.message,
      ts: observabilityEvents.ts,
    })
    .from(observabilityEvents)
    .where(and(...conditions))
    .orderBy(desc(observabilityEvents.ts))
    .limit(2000);

  const ackRows = await getDb()
    .select({ fingerprint: observabilityIssueAcks.fingerprint })
    .from(observabilityIssueAcks);
  const acked = new Set(ackRows.map((r) => r.fingerprint));

  const byFp = new Map<string, MatchingIssueSample>();
  let eventCount = 0;
  for (const row of rows) {
    if (acked.has(row.fingerprint)) continue;
    if (!levelMeetsMinimum(row.level, rule.minLevel)) continue;
    eventCount += 1;
    const existing = byFp.get(row.fingerprint);
    if (existing) {
      existing.count += 1;
    } else {
      byFp.set(row.fingerprint, {
        fingerprint: row.fingerprint,
        count: 1,
        sampleMessage: row.message.slice(0, 200),
        level: row.level,
      });
    }
  }

  const issues = [...byFp.values()].sort((a, b) => b.count - a.count);
  return { eventCount, issues };
}

/** Health hint for UI when Postgres alerts are unavailable. */
export function alertsRequirePostgres(): boolean {
  return !isPostgresConfigured();
}
