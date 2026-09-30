import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  resolveObservabilityConfig,
  type EnvBag,
} from "@/lib/observability/config";
import type {
  ObservabilityEventStore,
  ObservabilityExportResult,
} from "@/lib/observability/adapter";
import { type ErrorLogRecord } from "@/lib/observability/file-log";
import { redactEventFields } from "@/lib/observability/redact";
import type {
  ObservabilityEvent,
  ObservabilityEventInput,
  ObservabilityExportFormat,
  ObservabilityQueryFilters,
} from "@/lib/observability/types";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
/** Cap how much we read from disk when querying (main file only in v1). */
const MAX_READ_BYTES = 4 * 1024 * 1024;

function clampLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

function recordToEvent(record: ErrorLogRecord & { id?: string; source?: string; requestId?: string }): ObservabilityEvent {
  return {
    id: typeof record.id === "string" && record.id ? record.id : randomUUID(),
    ts: record.ts,
    level: record.level,
    source:
      record.source === "client" ||
      record.source === "cron" ||
      record.source === "edge" ||
      record.source === "server"
        ? record.source
        : "server",
    message: record.message,
    name: record.name,
    stack: record.stack,
    digest: record.digest,
    route: record.route,
    build: record.build,
    signal: record.signal ?? null,
    requestId: record.requestId,
    meta: record.meta,
  };
}

function matchesFilters(
  event: ObservabilityEvent,
  filters: ObservabilityQueryFilters,
): boolean {
  if (filters.since) {
    const sinceMs = Date.parse(filters.since);
    const tsMs = Date.parse(event.ts);
    if (Number.isFinite(sinceMs) && Number.isFinite(tsMs) && tsMs < sinceMs) {
      return false;
    }
  }
  if (filters.level && event.level !== filters.level) return false;
  if (filters.signal != null && filters.signal !== "" && event.signal !== filters.signal) {
    return false;
  }
  if (filters.source && event.source !== filters.source) return false;
  if (filters.routePrefix) {
    if (!event.route || !event.route.startsWith(filters.routePrefix)) return false;
  }
  return true;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function eventsToCsv(events: ObservabilityEvent[]): string {
  const header = [
    "id",
    "ts",
    "level",
    "source",
    "message",
    "name",
    "route",
    "signal",
    "build",
    "requestId",
    "digest",
    "stack",
    "meta",
  ];
  const lines = [header.join(",")];
  for (const e of events) {
    lines.push(
      [
        e.id,
        e.ts,
        e.level,
        e.source,
        e.message,
        e.name ?? "",
        e.route ?? "",
        e.signal ?? "",
        e.build ?? "",
        e.requestId ?? "",
        e.digest ?? "",
        e.stack ?? "",
        e.meta ? JSON.stringify(e.meta) : "",
      ]
        .map((cell) => escapeCsv(String(cell)))
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

function eventsToJsonl(events: ObservabilityEvent[]): string {
  return `${events.map((e) => JSON.stringify(e)).join("\n")}${events.length ? "\n" : ""}`;
}

/**
 * File-backed ObservabilityEventStore (JSONL + rotation via file-log).
 * Per-pod only — multi-replica needs a future Postgres backend.
 */
export class FileObservabilityStore implements ObservabilityEventStore {
  constructor(private readonly env: EnvBag = process.env) {}

  isEnabled(): boolean {
    const cfg = resolveObservabilityConfig(this.env);
    return cfg.errorLogFileEnabled && Boolean(cfg.errorLogFilePath);
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

    const event: ObservabilityEvent = {
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
      meta: redacted.meta,
    };

    // Persist via the existing append path so rotation / boot-warn stay shared.
    // We write a structured Error by encoding fields the file logger understands,
    // then overlay engine fields with a direct JSONL append of the full event.
    await this.appendEventLine(event);
    return event;
  }

  private async appendEventLine(event: ObservabilityEvent): Promise<void> {
    const cfg = resolveObservabilityConfig(this.env);
    if (!cfg.errorLogFileEnabled || !cfg.errorLogFilePath) return;

    // Reuse mkdir/rotate through appendServerErrorLog for directory setup, then
    // write the canonical event. Simpler: call low-level write mirroring file-log.
    const { appendFile, mkdir } = await import("node:fs/promises");
    const path = await import("node:path");
    const { rotateErrorLogIfNeeded } = await import("@/lib/observability/file-log");

    const filePath = cfg.errorLogFilePath;
    const dir = path.dirname(filePath);
    await mkdir(dir, { recursive: true });
    await rotateErrorLogIfNeeded(
      filePath,
      cfg.errorLogFileMaxBytes,
      cfg.errorLogFileKeep,
    );

    // Legacy-compatible record + engine fields (id, source, requestId).
    const line: ErrorLogRecord & {
      id: string;
      source: string;
      requestId?: string;
    } = {
      id: event.id,
      ts: event.ts,
      level: event.level,
      message: event.message,
      name: event.name,
      stack: event.stack,
      digest: event.digest,
      route: event.route,
      build: event.build,
      signal: event.signal,
      meta: event.meta,
      source: event.source,
      ...(event.requestId ? { requestId: event.requestId } : {}),
    };

    await appendFile(filePath, `${JSON.stringify(line)}\n`, "utf8");
  }

  async query(filters: ObservabilityQueryFilters = {}): Promise<ObservabilityEvent[]> {
    const events = await this.readRecentEvents();
    const limit = clampLimit(filters.limit);
    const matched = events.filter((e) => matchesFilters(e, filters));
    // Newest first
    matched.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
    return matched.slice(0, limit);
  }

  async export(
    filters: ObservabilityQueryFilters | undefined,
    format: ObservabilityExportFormat,
  ): Promise<ObservabilityExportResult> {
    const events = await this.query(filters ?? {});
    if (format === "csv") {
      return {
        format,
        body: eventsToCsv(events),
        eventCount: events.length,
        contentType: "text/csv; charset=utf-8",
        filename: "unionops-errors.csv",
      };
    }
    return {
      format: "jsonl",
      body: eventsToJsonl(events),
      eventCount: events.length,
      contentType: "application/x-ndjson; charset=utf-8",
      filename: "unionops-errors.jsonl",
    };
  }

  private async readRecentEvents(): Promise<ObservabilityEvent[]> {
    const cfg = resolveObservabilityConfig(this.env);
    if (!cfg.errorLogFileEnabled || !cfg.errorLogFilePath) return [];

    let raw: string;
    try {
      const buf = await readFile(cfg.errorLogFilePath);
      raw =
        buf.byteLength > MAX_READ_BYTES
          ? buf.subarray(buf.byteLength - MAX_READ_BYTES).toString("utf8")
          : buf.toString("utf8");
    } catch {
      return [];
    }

    // If we truncated mid-line, drop the partial first line.
    const lines = raw.split("\n");
    if (raw.length >= MAX_READ_BYTES && lines.length > 1) {
      lines.shift();
    }

    const events: ObservabilityEvent[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as ErrorLogRecord & {
          id?: string;
          source?: string;
          requestId?: string;
        };
        if (typeof parsed.message !== "string" || typeof parsed.ts !== "string") {
          continue;
        }
        events.push(recordToEvent(parsed));
      } catch {
        /* skip corrupt lines */
      }
    }
    return events;
  }
}
