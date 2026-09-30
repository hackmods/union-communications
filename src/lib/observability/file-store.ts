import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import {
  resolveObservabilityConfig,
  type EnvBag,
} from "@/lib/observability/config";
import type {
  ObservabilityEventStore,
  ObservabilityExportResult,
} from "@/lib/observability/adapter";
import { buildObservabilityExport } from "@/lib/observability/export-formats";
import { withFingerprint } from "@/lib/observability/fingerprint";
import { type ErrorLogRecord } from "@/lib/observability/file-log";
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
const MAX_READ_BYTES = 4 * 1024 * 1024;

function clampLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

function recordToEvent(
  record: ErrorLogRecord & {
    id?: string;
    source?: string;
    requestId?: string;
    fingerprint?: string;
  },
): ObservabilityEvent {
  return withFingerprint({
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
    fingerprint: record.fingerprint,
    meta: record.meta,
  });
}

/**
 * File-backed ObservabilityEventStore (JSONL + rotation).
 * Per-pod — prefer Postgres on Docker with DATABASE_URL.
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
      meta: redacted.meta,
    });

    await this.appendEventLine(event);
    return event;
  }

  private async appendEventLine(event: ObservabilityEvent): Promise<void> {
    const cfg = resolveObservabilityConfig(this.env);
    if (!cfg.errorLogFileEnabled || !cfg.errorLogFilePath) return;

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

    const line = {
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
      fingerprint: event.fingerprint,
      ...(event.requestId ? { requestId: event.requestId } : {}),
    };

    await appendFile(filePath, `${JSON.stringify(line)}\n`, "utf8");
  }

  async query(filters: ObservabilityQueryFilters = {}): Promise<ObservabilityEvent[]> {
    const events = await this.readRecentEvents();
    const limit = clampLimit(filters.limit);
    const matched = events.filter((e) => matchesObservabilityFilters(e, filters));
    matched.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
    return matched.slice(0, limit);
  }

  async summarize(filters: ObservabilityQueryFilters = {}): Promise<ObservabilitySummary> {
    const events = await this.query({ ...filters, limit: filters.limit ?? 500 });
    return summarizeEvents(events);
  }

  async stats(): Promise<ObservabilityStoreStats> {
    const cfg = resolveObservabilityConfig(this.env);
    if (!cfg.errorLogFileEnabled || !cfg.errorLogFilePath) {
      return {
        backend: "file",
        eventCountEstimate: 0,
        fileBytes: null,
        rotatedFiles: null,
      };
    }
    let fileBytes: number | null = null;
    let rotatedFiles = 0;
    try {
      fileBytes = (await stat(cfg.errorLogFilePath)).size;
    } catch {
      fileBytes = 0;
    }
    for (let i = 1; i <= cfg.errorLogFileKeep; i += 1) {
      try {
        await stat(`${cfg.errorLogFilePath}.${i}`);
        rotatedFiles += 1;
      } catch {
        /* missing */
      }
    }
    const events = await this.readRecentEvents();
    return {
      backend: "file",
      eventCountEstimate: events.length,
      fileBytes,
      rotatedFiles,
    };
  }

  async export(
    filters: ObservabilityQueryFilters | undefined,
    format: ObservabilityExportFormat,
  ): Promise<ObservabilityExportResult> {
    const events = await this.query(filters ?? {});
    return buildObservabilityExport(events, format);
  }

  private async readRecentEvents(): Promise<ObservabilityEvent[]> {
    const cfg = resolveObservabilityConfig(this.env);
    if (!cfg.errorLogFileEnabled || !cfg.errorLogFilePath) return [];

    const paths: string[] = [cfg.errorLogFilePath];
    for (let i = 1; i <= cfg.errorLogFileKeep; i += 1) {
      paths.push(`${cfg.errorLogFilePath}.${i}`);
    }

    let remaining = MAX_READ_BYTES;
    const chunks: string[] = [];

    for (const filePath of paths) {
      if (remaining <= 0) break;
      try {
        const buf = await readFile(filePath);
        if (buf.byteLength <= remaining) {
          chunks.push(buf.toString("utf8"));
          remaining -= buf.byteLength;
        } else {
          chunks.push(buf.subarray(buf.byteLength - remaining).toString("utf8"));
          remaining = 0;
        }
      } catch {
        /* missing sibling */
      }
    }

    const raw = chunks.join("\n");
    const lines = raw.split("\n");
    if (raw.length >= MAX_READ_BYTES && lines.length > 1) {
      lines.shift();
    }

    const events: ObservabilityEvent[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as ErrorLogRecord & {
          id?: string;
          source?: string;
          requestId?: string;
          fingerprint?: string;
        };
        if (typeof parsed.message !== "string" || typeof parsed.ts !== "string") {
          continue;
        }
        const event = recordToEvent(parsed);
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        events.push(event);
      } catch {
        /* skip corrupt */
      }
    }
    return events;
  }
}
