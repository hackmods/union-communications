import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
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
  type ObservabilityEmailFormat,
} from "@/lib/observability/alert-rules";
import {
  createFileAlertRule,
  deleteFileAlertRule,
  getLastFileAlertFiring,
  listFileAlertRules,
  recordFileAlertFiring,
  updateFileAlertRule,
  type FileAlertRule,
} from "@/lib/observability/file-alert-store";
import { resolveObservabilityConfig } from "@/lib/observability/config";
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
    unionId: row.unionId ?? null,
    thresholdCount: row.thresholdCount,
    windowMinutes: row.windowMinutes,
    cooldownMinutes: row.cooldownMinutes,
    recipients: row.recipients ?? [],
    recipientsByUnion: row.recipientsByUnion ?? null,
    emailFormat: (row.emailFormat as ObservabilityEmailFormat) ?? "multipart",
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

function fileRulesAvailable(): boolean {
  if (isPostgresConfigured()) return false;
  const cfg = resolveObservabilityConfig();
  return Boolean(cfg.errorLogFileEnabled && cfg.errorLogFilePath);
}

export function alertsBackend(): "postgres" | "file" | "none" {
  if (isPostgresConfigured()) return "postgres";
  if (fileRulesAvailable()) return "file";
  return "none";
}

export async function listObservabilityAlertRules(): Promise<
  ObservabilityAlertRule[]
> {
  if (isPostgresConfigured()) {
    const rows = await getDb()
      .select()
      .from(observabilityAlertRules)
      .orderBy(desc(observabilityAlertRules.updatedAt));
    return rows.map(rowToRule);
  }
  return listFileAlertRules();
}

export async function listEnabledObservabilityAlertRules(): Promise<
  ObservabilityAlertRule[]
> {
  const all = await listObservabilityAlertRules();
  return all.filter((r) => r.enabled);
}

export async function createObservabilityAlertRule(input: {
  name: string;
  enabled?: boolean;
  minLevel?: ObservabilityLevel;
  sources?: ObservabilitySource[] | null;
  fingerprint?: string | null;
  unionId?: string | null;
  thresholdCount?: number;
  windowMinutes?: number;
  cooldownMinutes?: number;
  recipients: string[];
  recipientsByUnion?: Record<string, string[]> | null;
  emailFormat?: ObservabilityEmailFormat;
  userId: string;
}): Promise<ObservabilityAlertRule> {
  if (!isPostgresConfigured()) {
    return createFileAlertRule(input);
  }
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
      unionId: input.unionId || null,
      thresholdCount: input.thresholdCount ?? 5,
      windowMinutes: input.windowMinutes ?? 15,
      cooldownMinutes: input.cooldownMinutes ?? 60,
      recipients: input.recipients,
      recipientsByUnion: input.recipientsByUnion ?? null,
      emailFormat: input.emailFormat ?? "multipart",
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
  unionId?: string | null;
  thresholdCount?: number;
  windowMinutes?: number;
  cooldownMinutes?: number;
  recipients?: string[];
  recipientsByUnion?: Record<string, string[]> | null;
  emailFormat?: ObservabilityEmailFormat;
  userId: string;
}): Promise<ObservabilityAlertRule | null> {
  if (!isPostgresConfigured()) {
    return updateFileAlertRule(input);
  }
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
  if (input.unionId !== undefined) patch.unionId = input.unionId || null;
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
  if (input.recipientsByUnion !== undefined) {
    patch.recipientsByUnion = input.recipientsByUnion;
  }
  if (input.emailFormat !== undefined) patch.emailFormat = input.emailFormat;

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
  if (!isPostgresConfigured()) {
    return deleteFileAlertRule(id);
  }
  const deleted = await getDb()
    .delete(observabilityAlertRules)
    .where(eq(observabilityAlertRules.id, id))
    .returning({ id: observabilityAlertRules.id });
  return deleted.length > 0;
}

export async function getLastAlertFiring(
  ruleId: string,
  unionId: string | null = null,
): Promise<{ firedAt: string; eventCount: number } | null> {
  if (!isPostgresConfigured()) {
    const row = await getLastFileAlertFiring(ruleId, unionId);
    return row
      ? { firedAt: row.firedAt, eventCount: row.eventCount }
      : null;
  }
  const conditions =
    unionId === null
      ? [
          eq(observabilityAlertFirings.ruleId, ruleId),
          isNull(observabilityAlertFirings.unionId),
        ]
      : [
          eq(observabilityAlertFirings.ruleId, ruleId),
          eq(observabilityAlertFirings.unionId, unionId),
        ];
  const [row] = await getDb()
    .select()
    .from(observabilityAlertFirings)
    .where(and(...conditions))
    .orderBy(desc(observabilityAlertFirings.firedAt))
    .limit(1);
  if (!row) {
    // Legacy firings without union_id column population — fall back to any for rule.
    const [any] = await getDb()
      .select()
      .from(observabilityAlertFirings)
      .where(eq(observabilityAlertFirings.ruleId, ruleId))
      .orderBy(desc(observabilityAlertFirings.firedAt))
      .limit(1);
    if (!any || unionId !== null) return null;
    return {
      firedAt:
        any.firedAt instanceof Date
          ? any.firedAt.toISOString()
          : String(any.firedAt),
      eventCount: any.eventCount,
    };
  }
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
  unionId?: string | null;
  eventCount: number;
  messageId?: string | null;
}): Promise<void> {
  if (!isPostgresConfigured()) {
    await recordFileAlertFiring(input);
    return;
  }
  await getDb().insert(observabilityAlertFirings).values({
    id: `oaf-${randomUUID()}`,
    ruleId: input.ruleId,
    fingerprint: input.fingerprint || null,
    unionId: input.unionId ?? null,
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
  unionId?: string | null;
};

export type MatchingIssuesResult = {
  eventCount: number;
  issues: MatchingIssueSample[];
  eventUnionIds: Array<string | null>;
};

/**
 * Count non-acked events matching a rule window. Returns samples for the email.
 * Works for Postgres; file/store path uses evaluate-alerts via store.query.
 */
export async function collectMatchingIssuesForRule(
  rule: ObservabilityAlertRuleLike,
  now = new Date(),
): Promise<MatchingIssuesResult> {
  if (!isPostgresConfigured()) {
    return { eventCount: 0, issues: [], eventUnionIds: [] };
  }

  const since = new Date(now.getTime() - rule.windowMinutes * 60_000);
  const conditions = [gte(observabilityEvents.ts, since)];

  if (rule.fingerprint) {
    conditions.push(eq(observabilityEvents.fingerprint, rule.fingerprint));
  }
  if (rule.unionId) {
    conditions.push(eq(observabilityEvents.unionId, rule.unionId));
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
      unionId: observabilityEvents.unionId,
    })
    .from(observabilityEvents)
    .where(and(...conditions))
    .orderBy(desc(observabilityEvents.ts))
    .limit(2000);

  const ackRows = await getDb()
    .select({ fingerprint: observabilityIssueAcks.fingerprint })
    .from(observabilityIssueAcks);
  const acked = new Set(ackRows.map((r) => r.fingerprint));

  return aggregateMatchingRows(
    rows.map((r) => ({
      fingerprint: r.fingerprint,
      level: r.level,
      message: r.message,
      unionId: r.unionId ?? null,
    })),
    rule,
    acked,
  );
}

export function aggregateMatchingRows(
  rows: Array<{
    fingerprint: string;
    level: ObservabilityLevel;
    message: string;
    unionId?: string | null;
    source?: ObservabilitySource;
  }>,
  rule: ObservabilityAlertRuleLike,
  acked: Set<string>,
): MatchingIssuesResult {
  const byFp = new Map<string, MatchingIssueSample>();
  const eventUnionIds: Array<string | null> = [];
  let eventCount = 0;
  for (const row of rows) {
    if (acked.has(row.fingerprint)) continue;
    if (!levelMeetsMinimum(row.level, rule.minLevel)) continue;
    if (rule.unionId && row.unionId !== rule.unionId) continue;
    if (rule.sources?.length && row.source && !rule.sources.includes(row.source)) {
      continue;
    }
    if (rule.fingerprint && row.fingerprint !== rule.fingerprint) continue;
    eventCount += 1;
    eventUnionIds.push(row.unionId ?? null);
    const existing = byFp.get(row.fingerprint);
    if (existing) {
      existing.count += 1;
    } else {
      byFp.set(row.fingerprint, {
        fingerprint: row.fingerprint,
        count: 1,
        sampleMessage: row.message.slice(0, 200),
        level: row.level,
        unionId: row.unionId ?? null,
      });
    }
  }
  const issues = [...byFp.values()].sort((a, b) => b.count - a.count);
  return { eventCount, issues, eventUnionIds };
}

/** @deprecated Prefer alertsBackend() — file hosts can evaluate when configured. */
export function alertsRequirePostgres(): boolean {
  return alertsBackend() === "none";
}

export type { FileAlertRule };
