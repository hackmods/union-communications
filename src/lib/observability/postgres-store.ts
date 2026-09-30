import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { observabilityEvents } from "@/lib/db/schema/observability";
import type {
  ObservabilityEventStore,
  ObservabilityExportResult,
} from "@/lib/observability/adapter";
import { buildObservabilityExport } from "@/lib/observability/export-formats";
import { withFingerprint } from "@/lib/observability/fingerprint";
import { redactEventFields } from "@/lib/observability/redact";
import {
  matchesObservabilityFilters,
  summarizeEvents,
} from "@/lib/observability/summarize";
import type {
  ObservabilityEvent,
  ObservabilityEventInput,
  ObservabilityExportFormat,
  ObservabilityQueryFilters,
  ObservabilityStoreStats,
  ObservabilitySummary,
} from "@/lib/observability/types";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function clampLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

function rowToEvent(row: typeof observabilityEvents.$inferSelect): ObservabilityEvent {
  return withFingerprint({
    id: row.id,
    ts: row.ts instanceof Date ? row.ts.toISOString() : String(row.ts),
    level: row.level,
    source: row.source,
    message: row.message,
    name: row.name ?? undefined,
    stack: row.stack ?? undefined,
    digest: row.digest ?? undefined,
    route: row.route ?? undefined,
    build: row.build ?? undefined,
    signal: row.signal ?? null,
    requestId: row.requestId ?? undefined,
    fingerprint: row.fingerprint,
    unionId: row.unionId ?? null,
    meta: row.meta ?? undefined,
  });
}

function buildWhere(filters: ObservabilityQueryFilters): SQL | undefined {
  const parts: SQL[] = [];
  if (filters.since) {
    const sinceMs = Date.parse(filters.since);
    if (Number.isFinite(sinceMs)) {
      parts.push(gte(observabilityEvents.ts, new Date(sinceMs)));
    }
  }
  if (filters.level) parts.push(eq(observabilityEvents.level, filters.level));
  if (filters.source) parts.push(eq(observabilityEvents.source, filters.source));
  if (filters.signal) parts.push(eq(observabilityEvents.signal, filters.signal));
  if (filters.fingerprint) {
    parts.push(eq(observabilityEvents.fingerprint, filters.fingerprint));
  }
  if (filters.unionId) {
    parts.push(eq(observabilityEvents.unionId, filters.unionId));
  }
  if (filters.routePrefix) {
    parts.push(sql`${observabilityEvents.route} LIKE ${`${filters.routePrefix}%`}`);
  }
  if (filters.q?.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    parts.push(
      or(
        ilike(observabilityEvents.message, pattern),
        ilike(observabilityEvents.name, pattern),
        ilike(observabilityEvents.route, pattern),
      )!,
    );
  }
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return and(...parts);
}

/**
 * Durable ObservabilityEventStore for Docker hosts with DATABASE_URL.
 * Query/export require platform-admin RLS GUC (customization_root).
 * Append works without GUCs (INSERT policy true).
 */
export class PostgresObservabilityStore implements ObservabilityEventStore {
  isEnabled(): boolean {
    return isPostgresConfigured();
  }

  async append(input: ObservabilityEventInput): Promise<ObservabilityEvent | null> {
    if (!this.isEnabled()) return null;

    const redacted = redactEventFields({
      message: input.message,
      name: input.name,
      stack: input.stack,
      digest: input.digest,
      route: input.route,
      meta: input.meta,
    });

    const event = withFingerprint({
      id: input.id ?? randomUUID(),
      ts: input.ts ?? new Date().toISOString(),
      level: input.level,
      source: input.source,
      message: redacted.message,
      name: redacted.name,
      stack: redacted.stack,
      digest: redacted.digest,
      route: redacted.route,
      build: input.build,
      signal: input.signal ?? null,
      requestId: input.requestId,
      fingerprint: input.fingerprint,
      unionId: input.unionId ?? null,
      meta: redacted.meta,
    });

    try {
      await getDb()
        .insert(observabilityEvents)
        .values({
          id: event.id,
          ts: new Date(event.ts),
          level: event.level,
          source: event.source,
          message: event.message.slice(0, 4000),
          name: event.name,
          stack: event.stack,
          digest: event.digest,
          route: event.route,
          build: event.build,
          signal: event.signal ?? null,
          requestId: event.requestId,
          fingerprint: event.fingerprint,
          unionId: event.unionId ?? null,
          meta: event.meta,
        });
      return event;
    } catch (err) {
      console.warn(
        "[observability] postgres append failed",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  async query(filters: ObservabilityQueryFilters = {}): Promise<ObservabilityEvent[]> {
    if (!this.isEnabled()) return [];
    const limit = clampLimit(filters.limit);
    const where = buildWhere(filters);
    const rows = await getDb()
      .select()
      .from(observabilityEvents)
      .where(where)
      .orderBy(desc(observabilityEvents.ts))
      .limit(limit);
    // Extra in-memory filter for routePrefix edge cases already in SQL
    return rows.map(rowToEvent).filter((e) => matchesObservabilityFilters(e, filters));
  }

  async summarize(filters: ObservabilityQueryFilters = {}): Promise<ObservabilitySummary> {
    // Pull a bounded window then group in process (issue counts stay accurate for export caps).
    const events = await this.query({ ...filters, limit: filters.limit ?? 500 });
    return summarizeEvents(events);
  }

  async stats(): Promise<ObservabilityStoreStats> {
    if (!this.isEnabled()) {
      return {
        backend: "postgres",
        eventCountEstimate: 0,
        fileBytes: null,
        rotatedFiles: null,
      };
    }
    try {
      const [row] = await getDb()
        .select({ value: count() })
        .from(observabilityEvents);
      return {
        backend: "postgres",
        eventCountEstimate: Number(row?.value ?? 0),
        fileBytes: null,
        rotatedFiles: null,
      };
    } catch {
      return {
        backend: "postgres",
        eventCountEstimate: null,
        fileBytes: null,
        rotatedFiles: null,
      };
    }
  }

  async export(
    filters: ObservabilityQueryFilters | undefined,
    format: ObservabilityExportFormat,
  ): Promise<ObservabilityExportResult> {
    const events = await this.query(filters ?? {});
    return buildObservabilityExport(events, format);
  }
}
