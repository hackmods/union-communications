/**
 * Canonical operator observability event.
 * Stable shape for file JSONL and Postgres store.
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
  /** Stable grouping key (Sentry-like issue fingerprint). */
  fingerprint?: string;
  /**
   * Optional tenant hint when known from Hub session / API context.
   * Never invent; null for cron/system and unauthenticated client errors.
   */
  unionId?: string | null;
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
  /** Substring match on message / name / route (case-insensitive). */
  q?: string;
  fingerprint?: string;
  /** Filter by optional union stamp. */
  unionId?: string;
};

export type ObservabilityExportFormat = "jsonl" | "csv" | "incident-pack";

/**
 * Backend selector. Auto: postgres when DATABASE_URL set; else file if enabled; else noop.
 */
export type ObservabilityBackend = "file" | "noop" | "postgres";

export type ObservabilityIssueSummary = {
  fingerprint: string;
  count: number;
  lastTs: string;
  sampleMessage: string;
  level: ObservabilityLevel;
  route?: string;
  source?: ObservabilitySource;
};

export type ObservabilitySummary = {
  total: number;
  byLevel: Record<ObservabilityLevel, number>;
  bySource: Record<ObservabilitySource, number>;
  byFingerprint: ObservabilityIssueSummary[];
};

export type ObservabilityStoreStats = {
  backend: ObservabilityBackend;
  eventCountEstimate: number | null;
  fileBytes: number | null;
  rotatedFiles: number | null;
};
