/**
 * Canonical operator observability event.
 * Stable shape for file JSONL today and a future Postgres store.
 */

export type ObservabilityLevel = "error" | "warn" | "info";

/** Where the event originated. */
export type ObservabilitySource = "server" | "client" | "cron" | "edge";

export type ObservabilityEvent = {
  id: string;
  ts: string;
  level: ObservabilityLevel;
  source: ObservabilitySource;
  message: string;
  name?: string;
  stack?: string;
  digest?: string;
  route?: string;
  /** BUILD_COMMIT_SHA at write time. */
  build?: string;
  /** Recognised-benign tag (e.g. auth.credentials_failed, action.drift). */
  signal?: string | null;
  /** Correlates with audit / request headers when present. */
  requestId?: string;
  /** Allowlisted classifier / operator metadata only. */
  meta?: Record<string, string | number | boolean | null>;
};

export type ObservabilityEventInput = Omit<ObservabilityEvent, "id" | "ts"> & {
  id?: string;
  ts?: string;
};

export type ObservabilityQueryFilters = {
  limit?: number;
  since?: string;
  level?: ObservabilityLevel;
  signal?: string;
  source?: ObservabilitySource;
  /** Match events whose route starts with this prefix. */
  routePrefix?: string;
};

export type ObservabilityExportFormat = "jsonl" | "csv";

/**
 * Backend selector. `postgres` is reserved for a future durable store —
 * v1 resolves it to file with a boot warn, or noop when file is off.
 */
export type ObservabilityBackend = "file" | "noop" | "postgres";
